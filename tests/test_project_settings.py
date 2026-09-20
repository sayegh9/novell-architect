import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import server


MANAGED_SETTING_KEYS = (
    "AUTONOVEL_API_BASE_URL",
    "AUTONOVEL_WRITER_MODEL",
    "AUTONOVEL_JUDGE_MODEL",
    "AUTONOVEL_REVIEW_MODEL",
    "AUTONOVEL_TEMPERATURE",
    "AUTONOVEL_TARGET_WORDS",
    "AUTONOVEL_LANGUAGE",
    "AUTONOVEL_NOVEL_TYPE",
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
            for key in (*MANAGED_SETTING_KEYS, "AUTONOVEL_PROJECT_DIR", "GEMINI_API_KEY")
        }

        server.SCRIPT_DIR = self.script_dir
        server.PROJECT_DIR = self.script_dir
        server.ORCHESTRATOR_LOG_PATH = self.script_dir / "autonovel-orchestrator.log"
        server.job_state.is_running = False
        server.job_state.current_process = None
        os.environ["GEMINI_API_KEY"] = "global-provider-key"

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
        server.api_set_active_project(server.SetActiveProjectRequest(id="project-b"))
        settings_b = server.api_get_settings()
        server.api_set_active_project(server.SetActiveProjectRequest(id="root"))
        settings_root = server.api_get_settings()

        self.assertEqual(settings_a["writer_model"], "a-json-writer")
        self.assertEqual(settings_a["judge_model"], "a-env-judge")
        self.assertEqual(settings_a["temperature"], 0.2)
        self.assertEqual(settings_a["language"], "fr")

        self.assertEqual(settings_b["writer_model"], "b-env-writer")
        self.assertEqual(settings_b["judge_model"], "gemini-3.7-flash")
        self.assertEqual(settings_b["temperature"], 0.75)
        self.assertEqual(settings_b["target_words"], 2100)
        self.assertEqual(settings_b["language"], "ar")

        self.assertEqual(settings_root["writer_model"], "root-env-writer")
        self.assertEqual(settings_root["judge_model"], "gemini-3.7-flash")
        self.assertEqual(settings_root["target_words"], 3500)
        self.assertEqual(settings_root["language"], "es")
        self.assertEqual(os.environ["GEMINI_API_KEY"], "global-provider-key")

    async def test_child_environment_uses_only_the_active_project_settings(self):
        self._write_settings(
            self.project_a,
            {
                "AUTONOVEL_WRITER_MODEL": "a-writer",
                "AUTONOVEL_JUDGE_MODEL": "a-judge",
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
        self.assertEqual(child_env["GEMINI_API_KEY"], "global-provider-key")


if __name__ == "__main__":
    unittest.main()
