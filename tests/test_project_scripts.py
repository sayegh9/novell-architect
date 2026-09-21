"""Run packaged CLI scripts against API-created projects with offline LLM responses."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


APP_DIR = Path(__file__).resolve().parents[1]

# Loaded only by the isolated child interpreters. Keep CLI parsing, imports,
# prompt formatting, nested processes, and all project file writes real.
OFFLINE_PROVIDER = '''
import json
import os
import sys
import time
import types
from pathlib import Path

project = Path(os.environ["AUTONOVEL_PROJECT_DIR"])
llm = types.ModuleType("llm")
def writer(prompt, system="", **kwargs):
    (project / "observed_writer.json").write_text(
        json.dumps({"prompt": prompt, "system": system, "cwd": str(Path.cwd())}),
        encoding="utf-8",
    )
    return "# Chapter 1\\n\\n" + "The traveler crossed the stone bridge. " * 400
def judge(prompt, **kwargs):
    return '{"overall_score": 8.0}'
llm.call_writer = writer
llm.call_judge = judge
sys.modules["llm"] = llm
time.sleep = lambda seconds: None
'''


class NewProjectScriptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="autonovel project ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        projects = self.root / "projects"
        projects.mkdir()
        with patch.object(server, "SCRIPT_DIR", self.root):
            created = server.api_create_project(server.CreateProjectRequest(name="New novel"))
        self.project = Path(created["path"])
        self.assertFalse((self.project / "prompts").exists())
        (self.project / "seed.txt").write_text("A traveler seeks the missing bell.", encoding="utf-8")
        (self.project / "outline.md").write_text(
            "### Chapter 1: Arrival\n- The traveler discovers a silver key.\n",
            encoding="utf-8",
        )
        self.provider_dir = self.root / "offline_provider"
        self.provider_dir.mkdir()
        (self.provider_dir / "sitecustomize.py").write_text(OFFLINE_PROVIDER, encoding="utf-8")
        self.environment = {
            key: value for key, value in os.environ.items()
            if not key.endswith("API_KEY") and not key.startswith("AUTONOVEL_")
        }
        self.environment.update({
            "AUTONOVEL_PROJECT_DIR": str(self.project),
            "AUTONOVEL_LANGUAGE": "en",
            "PYTHONPATH": str(self.provider_dir),
            "PYTHON_DOTENV_DISABLED": "1",
        })

    def run_script(self, name, *args):
        return subprocess.run(
            [sys.executable, str(APP_DIR / name), *args],
            cwd=self.project, env=self.environment, capture_output=True, text=True,
            timeout=15,
        )

    def assert_drafted(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        chapter = self.project / "chapters" / "ch_01.md"
        self.assertTrue(chapter.is_file(), result.stdout + result.stderr)
        self.assertIn("The traveler crossed the stone bridge.", chapter.read_text(encoding="utf-8"))
        observed = json.loads((self.project / "observed_writer.json").read_text(encoding="utf-8"))
        self.assertIn("A traveler seeks the missing bell.", observed["prompt"])
        self.assertIn("silver key", observed["prompt"])
        self.assertEqual(observed["cwd"], str(self.project))
        return observed

    def test_single_draft_uses_packaged_prompts_in_api_created_project(self):
        for language in ("en", "ar"):
            with self.subTest(language=language):
                self.environment["AUTONOVEL_LANGUAGE"] = language
                observed = self.assert_drafted(self.run_script("draft_chapter.py", "1"))
                self.assertEqual(
                    observed["system"],
                    (APP_DIR / "prompts" / language / "writer_system.txt").read_text(encoding="utf-8"),
                )
                self.assertFalse((self.project / "prompts").exists())

    def test_fresh_rewrite_uses_packaged_prompts_and_backs_up_old_prose(self):
        chapters = self.project / "chapters"
        chapters.mkdir()
        for language in ("en", "ar"):
            with self.subTest(language=language):
                self.environment["AUTONOVEL_LANGUAGE"] = language
                (chapters / "ch_01.md").write_text("OLD PROSE MUST NOT ENTER PROMPT", encoding="utf-8")
                observed = self.assert_drafted(self.run_script("rewrite_chapter_beats.py", "1", "--mode=fresh"))
                self.assertNotIn("OLD PROSE", observed["prompt"])
                self.assertTrue(any(
                    backup.read_text(encoding="utf-8") == "OLD PROSE MUST NOT ENTER PROMPT"
                    for backup in (self.project / "chapters_backup").glob("ch_01_*.md")
                ))
                self.assertEqual(
                    observed["system"],
                    (APP_DIR / "prompts" / language / "writer_system.txt").read_text(encoding="utf-8"),
                )

    def test_project_prompt_override_wins_while_other_templates_fall_back(self):
        prompts = self.project / "prompts" / "en"
        prompts.mkdir(parents=True)
        (prompts / "writer_system.txt").write_text("Custom project voice.", encoding="utf-8")
        observed = self.assert_drafted(self.run_script("draft_chapter.py", "1"))
        self.assertEqual(observed["system"], "Custom project voice.")

    def test_batch_runs_packaged_nested_scripts_with_project_cwd_and_data(self):
        # Give this test its own prompts so missing fallback cannot mask the
        # independent nested-script resolution failure.
        shutil.copytree(APP_DIR / "prompts", self.project / "prompts")
        result = self.run_script("run_drafts.py", "--start=1", "--end=1")
        self.assert_drafted(result)
        logs = list((self.project / "eval_logs").glob("*_ch01.json"))
        self.assertEqual(len(logs), 1, result.stdout + result.stderr)
        self.assertIn("overall_score", json.loads(logs[0].read_text(encoding="utf-8")))
        state = json.loads((self.project / "state.json").read_text(encoding="utf-8"))
        self.assertEqual(state["chapters_drafted"], 1)
        self.assertEqual(state["current_focus"], "ch_01")
        self.assertFalse((self.project / "draft_chapter.py").exists())
        self.assertFalse((self.project / "evaluate.py").exists())


if __name__ == "__main__":
    unittest.main()
