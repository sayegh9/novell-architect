#!/usr/bin/env python3
"""Optional live provider smoke test; excluded from the offline suite."""

import os
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parents[1])).resolve()
sys.path.insert(0, str(BASE_DIR))

def _live_provider_enabled() -> bool:
    return os.environ.get("AUTONOVEL_RUN_LIVE_TESTS") == "1" and bool(
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("ANTHROPIC_API_KEY")
    )


@unittest.skipUnless(
    _live_provider_enabled(),
    "set AUTONOVEL_RUN_LIVE_TESTS=1 and a Gemini or Anthropic API key to run live tests",
)
class LiveProviderEvaluationTests(unittest.TestCase):
    def test_evaluates_chapter_one_with_configured_provider(self):
        from evaluate import evaluate_chapter

        result = evaluate_chapter(1)
        self.assertIn("overall_score", result)


if __name__ == "__main__":
    unittest.main()
