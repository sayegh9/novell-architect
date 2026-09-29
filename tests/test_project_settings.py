import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import server
import settings as project_settings


APP_DIR = Path(__file__).resolve().parents[1]


MANAGED_SETTING_KEYS = (
    "AUTONOVEL_API_BASE_URL",
    "AUTONOVEL_PROVIDER",
    "AUTONOVEL_WRITER_MODEL",
    "AUTONOVEL_JUDGE_MODEL",
    "AUTONOVEL_REVIEW_MODEL",
    "AUTONOVEL_TEMPERATURE",
    "AUTONOVEL_TARGET_WORDS",
    "AUTONOVEL_LANGUAGE",
    "AUTONOVEL_NOVEL_TYPE",
)

PROVIDER_API_KEYS = (
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "ANTHROPIC_API_KEY",
)


class _EmptyStream:
    async def readline(self):
        return b""


class _CompletedProcess:
    def __init__(self):
        self.stdout = _EmptyStream()
        self.returncode = 0

    async def wait(self):
        return self.returncode


class ProjectSettingsTests(unittest.IsolatedAsyncioTestCase):
    def test_settings_save_provider_and_keys_without_returning_secrets(self):
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-a"))
        response = server.api_update_settings(server.SettingsUpdateRequest(
            provider="anthropic",
            writer_model="claude-sonnet-4-6",
            judge_model="claude-sonnet-4-6",
            review_model="claude-opus-4-6",
            gemini_api_key="test-gemini-secret",
            anthropic_api_key="test-anthropic-secret",
        ))
        env_file = self.project_a / ".env"
        self.assertEqual(stat.S_IMODE(env_file.stat().st_mode), 0o600)
        self.assertIn(".env", (self.project_a / ".gitignore").read_text().splitlines())
        self.assertEqual(response["settings"]["provider"], "anthropic")
        self.assertEqual(response["settings"]["review_model"], "claude-opus-4-6")
        self.assertTrue(response["settings"]["has_gemini_key"])
        self.assertTrue(response["settings"]["has_anthropic_key"])
        self.assertNotIn("test-gemini-secret", json.dumps(response))
        self.assertNotIn("test-anthropic-secret", json.dumps(response))

        server.api_set_active_project(server.SetActiveProjectRequest(id="project-b"))
        self.assertEqual(server.api_get_settings()["provider"], "auto")
        self.assertFalse(server.api_get_settings()["has_anthropic_key"])
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-a"))

        server.api_update_settings(server.SettingsUpdateRequest(clear_anthropic_key=True))
        self.assertFalse(server.api_get_settings()["has_anthropic_key"])
        self.assertTrue(server.api_get_settings()["has_gemini_key"])
        self.assertNotIn("ANTHROPIC_API_KEY", env_file.read_text())

    def test_removing_root_key_updates_startup_fallback(self):
        with patch.object(server, "SERVER_ENV_FILE", self.script_dir / ".env"):
            server.api_update_settings(server.SettingsUpdateRequest(gemini_api_key="temporary-root-key"))
            self.assertTrue(server.api_get_settings()["has_gemini_key"])
            server.api_update_settings(server.SettingsUpdateRequest(clear_gemini_key=True))
            self.assertFalse(server.api_get_settings()["has_gemini_key"])
            self.assertNotIn("GEMINI_API_KEY", project_settings.STARTUP_PROVIDER_ENVIRONMENT)

    def test_explicit_server_env_file_reaches_runtime_and_child_jobs(self):
        server_env = self.script_dir / "server.env"
        server_env.write_text("GEMINI_API_KEY=test-provider-key\n", encoding="utf-8")
        environment = {
            key: value
            for key, value in os.environ.items()
            if key not in PROVIDER_API_KEYS and not key.startswith("AUTONOVEL_")
        }
        environment.update(
            {
                "AUTONOVEL_ENV_FILE": str(server_env),
                "AUTONOVEL_PROJECT_DIR": str(self.project_b),
                "PYTHONPATH": str(APP_DIR),
            }
        )
        script = """
import json
import os
import server
from settings import child_process_environment

child = child_process_environment(server.PROJECT_DIR, {})
print(json.dumps({
    "runtime_has_key": bool(os.environ.get("GEMINI_API_KEY")),
    "child_has_key": bool(child.get("GEMINI_API_KEY")),
}))
"""

        result = subprocess.run(
            [sys.executable, "-c", script],
            cwd=APP_DIR,
            env=environment,
            capture_output=True,
            text=True,
            timeout=15,
        )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(
            json.loads(result.stdout.strip()),
            {"runtime_has_key": True, "child_has_key": True},
        )

    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.script_dir = Path(self._temp_dir.name).resolve()
        self.projects_dir = self.script_dir / "projects"
        self.projects_dir.mkdir()
        self.project_a = self._make_project("project-a")
        self.project_b = self._make_project("project-b")

        self._original_script_dir = server.SCRIPT_DIR
        self._original_project_dir = server.PROJECT_DIR
        self._original_log_path = getattr(server, "ORCHESTRATOR_LOG_PATH", None)
        self._original_environment = {
            key: os.environ.get(key)
            for key in (*MANAGED_SETTING_KEYS, "AUTONOVEL_PROJECT_DIR", *PROVIDER_API_KEYS)
        }
        self._startup_provider_patch = patch.object(
            project_settings,
            "STARTUP_PROVIDER_ENVIRONMENT",
            {},
            create=True,
        )
        self._startup_provider_patch.start()

        server.SCRIPT_DIR = self.script_dir
        server.PROJECT_DIR = self.script_dir
        server.ORCHESTRATOR_LOG_PATH = self.script_dir / "autonovel-orchestrator.log"
        server.job_state.is_running = False
        server.job_state.current_process = None
        for key in PROVIDER_API_KEYS:
            os.environ.pop(key, None)

    def tearDown(self):
        server.SCRIPT_DIR = self._original_script_dir
        server.PROJECT_DIR = self._original_project_dir
        if self._original_log_path is None:
            del server.ORCHESTRATOR_LOG_PATH
        else:
            server.ORCHESTRATOR_LOG_PATH = self._original_log_path
        server.job_state.is_running = False
        server.job_state.current_process = None
        for key, value in self._original_environment.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        self._startup_provider_patch.stop()
        self._temp_dir.cleanup()

    def _make_project(self, project_id: str) -> Path:
        project_dir = self.projects_dir / project_id
        project_dir.mkdir()
        return project_dir

    @staticmethod
    def _write_settings(project_dir: Path, values: dict[str, str]) -> None:
        (project_dir / "settings.json").write_text(
            json.dumps(values), encoding="utf-8"
        )

    @staticmethod
    def _write_env(project_dir: Path, values: dict[str, str]) -> None:
        (project_dir / ".env").write_text(
            "".join(f"{key}={value}\n" for key, value in values.items()),
            encoding="utf-8",
        )

    def test_switching_a_to_b_to_root_rebuilds_managed_settings(self):
        self._write_env(
            self.project_a,
            {
                "AUTONOVEL_JUDGE_MODEL": "a-env-judge",
                "AUTONOVEL_TEMPERATURE": "0.2",
                "GEMINI_API_KEY": "project-a-provider-key",
            },
        )
        self._write_settings(
            self.project_a,
            {
                "AUTONOVEL_WRITER_MODEL": "a-json-writer",
                "AUTONOVEL_LANGUAGE": "fr",
                "GEMINI_API_KEY": "project-a-settings-provider-key",
            },
        )
        self._write_env(
            self.project_b,
            {"AUTONOVEL_WRITER_MODEL": "b-env-writer"},
        )
        self._write_settings(
            self.project_b,
            {"AUTONOVEL_TARGET_WORDS": "2100"},
        )
        self._write_env(
            self.script_dir,
            {"AUTONOVEL_WRITER_MODEL": "root-env-writer"},
        )
        self._write_settings(
            self.script_dir,
            {
                "AUTONOVEL_LANGUAGE": "es",
                "GEMINI_API_KEY": "root-settings-provider-key",
            },
        )

        server.api_set_active_project(server.SetActiveProjectRequest(id="project-a"))
        settings_a = server.api_get_settings()
        provider_key_a = os.environ.get("GEMINI_API_KEY")
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-b"))
        settings_b = server.api_get_settings()
        provider_key_b = os.environ.get("GEMINI_API_KEY")
        server.api_set_active_project(server.SetActiveProjectRequest(id="root"))
        settings_root = server.api_get_settings()
        provider_key_root = os.environ.get("GEMINI_API_KEY")

        self.assertEqual(settings_a["writer_model"], "a-json-writer")
        self.assertEqual(settings_a["judge_model"], "a-env-judge")
        self.assertEqual(settings_a["temperature"], 0.2)
        self.assertEqual(settings_a["language"], "fr")
        self.assertTrue(settings_a["has_gemini_key"])
        self.assertNotIn("GEMINI_API_KEY", settings_a)
        self.assertEqual(provider_key_a, "project-a-provider-key")

        self.assertEqual(settings_b["writer_model"], "b-env-writer")
        self.assertEqual(settings_b["judge_model"], "gemini-3.7-flash")
        self.assertEqual(settings_b["temperature"], 0.75)
        self.assertEqual(settings_b["target_words"], 2100)
        self.assertEqual(settings_b["language"], "ar")
        self.assertFalse(settings_b["has_gemini_key"])
        self.assertIsNone(provider_key_b)

        self.assertEqual(settings_root["writer_model"], "root-env-writer")
        self.assertEqual(settings_root["judge_model"], "gemini-3.7-flash")
        self.assertEqual(settings_root["target_words"], 3500)
        self.assertEqual(settings_root["language"], "es")
        self.assertTrue(settings_root["has_gemini_key"])
        self.assertEqual(provider_key_root, "root-settings-provider-key")

    async def test_child_environment_uses_only_the_active_project_settings(self):
        self._write_settings(
            self.project_a,
            {
                "AUTONOVEL_WRITER_MODEL": "a-writer",
                "AUTONOVEL_JUDGE_MODEL": "a-judge",
                "GEMINI_API_KEY": "project-a-provider-key",
            },
        )
        self._write_env(
            self.project_b,
            {
                "AUTONOVEL_WRITER_MODEL": "b-writer",
                "AUTONOVEL_NOVEL_TYPE": "novella",
            },
        )

        server.api_set_active_project(server.SetActiveProjectRequest(id="project-a"))
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-b"))

        with (
            patch.object(
                server.asyncio,
                "create_subprocess_exec",
                AsyncMock(return_value=_CompletedProcess()),
            ) as create_process,
            patch.object(server.manager, "broadcast", AsyncMock()),
        ):
            await server.run_command_stream(("draft_chapter.py", "1"), "draft_chapter.py 1")

        child_env = create_process.await_args.kwargs["env"]
        self.assertEqual(child_env["AUTONOVEL_PROJECT_DIR"], str(self.project_b))
        self.assertEqual(child_env["AUTONOVEL_WRITER_MODEL"], "b-writer")
        self.assertEqual(child_env["AUTONOVEL_JUDGE_MODEL"], "gemini-3.7-flash")
        self.assertEqual(child_env["AUTONOVEL_NOVEL_TYPE"], "novella")
        self.assertNotIn("a-writer", child_env.values())
        self.assertNotIn("a-judge", child_env.values())
        self.assertNotIn("GEMINI_API_KEY", child_env)

    async def test_project_provider_key_falls_back_to_startup_global_for_b_and_child(self):
        project_settings.STARTUP_PROVIDER_ENVIRONMENT = {
            "GEMINI_API_KEY": "startup-global-provider-key"
        }
        os.environ["GEMINI_API_KEY"] = "startup-global-provider-key"
        self._write_env(
            self.project_a,
            {"GEMINI_API_KEY": "project-a-provider-key"},
        )

        server.api_set_active_project(server.SetActiveProjectRequest(id="project-a"))
        provider_key_a = os.environ.get("GEMINI_API_KEY")
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-b"))
        provider_key_b = os.environ.get("GEMINI_API_KEY")

        with (
            patch.object(
                server.asyncio,
                "create_subprocess_exec",
                AsyncMock(return_value=_CompletedProcess()),
            ) as create_process,
            patch.object(server.manager, "broadcast", AsyncMock()),
        ):
            await server.run_command_stream(("draft_chapter.py", "1"), "draft_chapter.py 1")

        child_env = create_process.await_args.kwargs["env"]
        self.assertEqual(provider_key_a, "project-a-provider-key")
        self.assertEqual(provider_key_b, "startup-global-provider-key")
        self.assertEqual(
            child_env["GEMINI_API_KEY"], "startup-global-provider-key"
        )


if __name__ == "__main__":
    unittest.main()
