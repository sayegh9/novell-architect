import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class FoundationScoreSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.project_dir = Path(self.temp_dir.name)
        (self.project_dir / "eval_logs").mkdir()

    def write_foundation_log(self, timestamp: str, overall: float, lore: float):
        log_path = self.project_dir / "eval_logs" / f"{timestamp}_foundation.json"
        log_path.write_text(
            json.dumps({"overall_score": overall, "lore_score": lore}),
            encoding="utf-8",
        )

    def test_score_is_loaded_when_state_file_does_not_exist(self):
        self.write_foundation_log("20260921_200130", 9, 9.4)

        with patch.object(server, "PROJECT_DIR", self.project_dir):
            state = server.get_state()

        self.assertEqual(state["foundation_score"], 9.0)
        self.assertEqual(state["lore_score"], 9.4)
        persisted = json.loads(
            (self.project_dir / "state.json").read_text(encoding="utf-8")
        )
        self.assertEqual(persisted["foundation_score"], 9.0)

    def test_latest_log_replaces_an_existing_nonzero_score(self):
        (self.project_dir / "state.json").write_text(
            json.dumps({"foundation_score": 4.0, "lore_score": 4.5}),
            encoding="utf-8",
        )
        self.write_foundation_log("20260920_120000", 7, 7.2)
        self.write_foundation_log("20260921_200130", 9, 9.4)

        with patch.object(server, "PROJECT_DIR", self.project_dir):
            state = server.get_state()

        self.assertEqual(state["foundation_score"], 9.0)
        self.assertEqual(state["lore_score"], 9.4)

    def test_malformed_newest_log_falls_back_to_latest_valid_log(self):
        self.write_foundation_log("20260920_120000", 8.1, 8.2)
        (self.project_dir / "eval_logs" / "20260921_200130_foundation.json").write_text(
            "not json",
            encoding="utf-8",
        )

        with patch.object(server, "PROJECT_DIR", self.project_dir):
            state = server.get_state()

        self.assertEqual(state["foundation_score"], 8.1)
        self.assertEqual(state["lore_score"], 8.2)


if __name__ == "__main__":
    unittest.main()
