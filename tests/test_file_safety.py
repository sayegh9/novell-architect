import importlib
import importlib.util
import io
import json
import os
import stat
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

import server


def load_file_utils():
    spec = importlib.util.find_spec("file_utils")
    if spec is None:
        raise AssertionError("file_utils must provide atomic core-file writes")
    return importlib.import_module("file_utils")


class AtomicWriteTests(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.directory = Path(self._temp_dir.name)

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_replace_failure_leaves_original_file_and_permissions_intact(self):
        file_utils = load_file_utils()
        target = self.directory / "outline.md"
        target.write_bytes(b"old outline\r\n")
        target.chmod(0o640)

        with patch.object(file_utils.os, "replace", side_effect=OSError("disk full")):
            with self.assertRaisesRegex(OSError, "disk full"):
                file_utils.atomic_write_text(
                    target, "new outline\r\n", encoding="utf-8", newline=""
                )

        self.assertEqual(target.read_bytes(), b"old outline\r\n")
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o640)
        self.assertEqual(list(self.directory.iterdir()), [target])

    def test_successful_replace_preserves_utf8_newlines_and_existing_permissions(self):
        file_utils = load_file_utils()
        target = self.directory / "chapter.md"
        target.write_text("old", encoding="utf-8")
        target.chmod(0o640)

        file_utils.atomic_write_text(
            target, "أهلاً\r\nSecond line\r\n", encoding="utf-8", newline=""
        )

        self.assertEqual(
            target.read_bytes(), "أهلاً\r\nSecond line\r\n".encode("utf-8")
        )
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o640)
        self.assertEqual(list(self.directory.iterdir()), [target])


class ServerFileSafetyTests(unittest.TestCase):
    def test_generic_file_api_cannot_read_or_replace_project_credentials(self):
        env_path = self.project_dir / ".env"
        env_path.write_text("GEMINI_API_KEY=private-test-value\n", encoding="utf-8")
        read_response = self.client.get("/api/files/.env")
        write_response = self.client.post("/api/files/.env", json={"content": "changed"})
        self.assertEqual(read_response.status_code, 404)
        self.assertEqual(write_response.status_code, 404)
        self.assertNotIn("private-test-value", read_response.text)
        self.assertEqual(env_path.read_text(), "GEMINI_API_KEY=private-test-value\n")

    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.project_dir = Path(self._temp_dir.name)
        self.original_project_dir = server.PROJECT_DIR
        server.PROJECT_DIR = self.project_dir
        self.client = TestClient(server.app)

    def tearDown(self):
        server.PROJECT_DIR = self.original_project_dir
        self._temp_dir.cleanup()

    def test_planning_write_failure_returns_actionable_error_and_keeps_original(self):
        target = self.project_dir / "world.md"
        target.write_text("original", encoding="utf-8")

        with patch.object(
            server,
            "atomic_write_text",
            side_effect=OSError("read-only filesystem"),
            create=True,
        ):
            response = self.client.post(
                "/api/files/world.md", json={"content": "replacement"}
            )

        self.assertEqual(response.status_code, 500)
        self.assertIn("world.md", response.json()["detail"])
        self.assertIn("read-only filesystem", response.json()["detail"])
        self.assertEqual(target.read_text(encoding="utf-8"), "original")

    def test_outline_replace_failure_keeps_original_and_recoverable_backup(self):
        file_utils = load_file_utils()
        original = (
            "# Outline\r\n\r\n"
            "## Chapter 1: Old\r\n- Keep me safe.\r\n\r\n"
            "## Chapter 2: Later\r\n- Untouched.\r\n"
        )
        outline_path = self.project_dir / "outline.md"
        outline_path.write_bytes(original.encode("utf-8"))
        real_replace = file_utils.os.replace

        def fail_outline_replace(source, destination):
            if Path(destination) == outline_path:
                raise OSError("replacement interrupted")
            return real_replace(source, destination)

        with patch.object(file_utils.os, "replace", side_effect=fail_outline_replace):
            response = self.client.post(
                "/api/chapters/1/beats",
                json={"beats": "## Chapter 1: New\n- Replacement."},
            )

        self.assertEqual(response.status_code, 500)
        self.assertIn("outline.md", response.json()["detail"])
        self.assertIn("replacement interrupted", response.json()["detail"])
        self.assertEqual(outline_path.read_bytes(), original.encode("utf-8"))
        backups = list((self.project_dir / "outline_backups").glob("outline_*.md"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), original.encode("utf-8"))

    def test_state_sync_replace_failure_keeps_original_and_logs_the_path(self):
        file_utils = load_file_utils()
        original_state = {
            "phase": "foundation",
            "foundation_score": 0.0,
            "chapters_drafted": 0,
        }
        state_path = self.project_dir / "state.json"
        state_path.write_text(json.dumps(original_state), encoding="utf-8")
        eval_dir = self.project_dir / "eval_logs"
        eval_dir.mkdir()
        (eval_dir / "latest_foundation.json").write_text(
            json.dumps({"overall_score": 8.5}), encoding="utf-8"
        )
        real_replace = file_utils.os.replace

        def fail_state_replace(source, destination):
            if Path(destination) == state_path:
                raise OSError("state replacement interrupted")
            return real_replace(source, destination)

        errors = io.StringIO()
        with (
            patch.object(file_utils.os, "replace", side_effect=fail_state_replace),
            redirect_stderr(errors),
        ):
            server.get_state()

        self.assertEqual(json.loads(state_path.read_text(encoding="utf-8")), original_state)
        self.assertIn(str(state_path), errors.getvalue())
        self.assertIn("state replacement interrupted", errors.getvalue())

    def test_env_write_failure_does_not_fall_back_or_change_runtime_settings(self):
        file_utils = load_file_utils()
        env_path = self.project_dir / ".env"
        env_path.write_text("AUTONOVEL_WRITER_MODEL=old-model\n", encoding="utf-8")
        settings_path = self.project_dir / "settings.json"
        original_settings = {
            "AUTONOVEL_WRITER_MODEL": "json-old-model",
            "AUTONOVEL_LANGUAGE": "fr",
        }
        settings_path.write_text(json.dumps(original_settings), encoding="utf-8")
        real_replace = file_utils.os.replace

        def fail_env_replace(source, destination):
            if Path(destination) == env_path:
                raise OSError("env storage unavailable")
            return real_replace(source, destination)

        with (
            patch.dict(os.environ, {"AUTONOVEL_WRITER_MODEL": "old-model"}),
            patch.object(file_utils.os, "replace", side_effect=fail_env_replace),
        ):
            response = self.client.post(
                "/api/settings", json={"writer_model": "new-model"}
            )
            runtime_after_response = os.environ["AUTONOVEL_WRITER_MODEL"]
            server.rebuild_runtime_settings(self.project_dir)
            runtime_after_rebuild = os.environ["AUTONOVEL_WRITER_MODEL"]

        self.assertEqual(response.status_code, 500)
        self.assertIn(".env", response.json()["detail"])
        self.assertIn("env storage unavailable", response.json()["detail"])
        self.assertEqual(runtime_after_response, "old-model")
        self.assertEqual(runtime_after_rebuild, "old-model")
        self.assertEqual(
            env_path.read_text(encoding="utf-8"),
            "AUTONOVEL_WRITER_MODEL=old-model\n",
        )
        self.assertEqual(
            json.loads(settings_path.read_text(encoding="utf-8")), original_settings
        )


class BoundedJobLogTests(unittest.TestCase):
    def test_configured_line_cap_discards_old_lines_and_api_returns_recent_history(self):
        with patch.dict(os.environ, {"AUTONOVEL_JOB_LOG_MAX_LINES": "3"}):
            state = server.JobState()

        for line in ("one\n", "two\n", "three\n", "four\n", "five\n"):
            state.logs.append(line)

        original_state = server.job_state
        server.job_state = state
        try:
            payload = server.api_get_logs()
        finally:
            server.job_state = original_state

        self.assertEqual(payload["logs"], ["three\n", "four\n", "five\n"])
        self.assertEqual(state.logs.maxlen, 3)


class RecordingWebSocket:
    def __init__(self):
        self.messages = []

    async def accept(self):
        return None

    async def send_json(self, message):
        self.messages.append(message)

    async def receive_text(self):
        raise WebSocketDisconnect()


class BoundedJobLogWebSocketTests(unittest.IsolatedAsyncioTestCase):
    async def test_new_connection_receives_the_most_recent_fifty_retained_lines(self):
        state = server.JobState(max_log_lines=60)
        for number in range(75):
            state.logs.append(f"line-{number}\n")
        websocket = RecordingWebSocket()
        original_state = server.job_state
        server.job_state = state
        try:
            await server.websocket_endpoint(websocket)
        finally:
            server.job_state = original_state

        connected = websocket.messages[0]
        self.assertEqual(connected["type"], "connected")
        self.assertEqual(
            connected["logs_preview"],
            [f"line-{number}\n" for number in range(25, 75)],
        )


if __name__ == "__main__":
    unittest.main()
