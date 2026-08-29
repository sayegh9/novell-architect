#!/usr/bin/env python3
"""
test_llm_pipeline.py -- Verification test suite for autonovel Gemini refactoring.
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

import llm


class TestLLMClient(unittest.TestCase):

    def test_clean_json_response(self):
        fenced_json = "```json\n{\"test\": 123}\n```"
        cleaned = llm.clean_json_response(fenced_json)
        self.assertEqual(cleaned, "{\"test\": 123}")

    @patch("llm._call_gemini")
    def test_gemini_dispatch_writer(self, mock_gemini):
        mock_gemini.return_value = "Mock novel content"
        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaSyFakeKey", "AUTONOVEL_WRITER_MODEL": "gemini-2.5-pro"}):
            # Reload module-level flags if needed
            llm.GEMINI_API_KEY = "AIzaSyFakeKey"
            llm.WRITER_MODEL = "gemini-2.5-pro"
            result = llm.call_writer("Test prompt", system="System test")
            self.assertEqual(result, "Mock novel content")
            mock_gemini.assert_called_once()
            args, kwargs = mock_gemini.call_args
            self.assertEqual(kwargs["model"], "gemini-2.5-pro")
            self.assertEqual(kwargs["system"], "System test")
            self.assertEqual(kwargs["prompt"], "Test prompt")

    @patch("llm._call_gemini")
    def test_gemini_dispatch_judge(self, mock_gemini):
        mock_gemini.return_value = '{"overall_score": 8.5}'
        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaSyFakeKey", "AUTONOVEL_JUDGE_MODEL": "gemini-2.5-pro"}):
            llm.GEMINI_API_KEY = "AIzaSyFakeKey"
            llm.JUDGE_MODEL = "gemini-2.5-pro"
            result = llm.call_judge("Evaluate this", system="Critic")
            self.assertEqual(result, '{"overall_score": 8.5}')
            mock_gemini.assert_called_once()
            args, kwargs = mock_gemini.call_args
            self.assertEqual(kwargs["model"], "gemini-2.5-pro")
            self.assertEqual(kwargs["temperature"], 0.3)

    @patch("llm._call_gemini")
    def test_gemini_dispatch_review(self, mock_gemini):
        mock_gemini.return_value = "5 stars review"
        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaSyFakeKey", "AUTONOVEL_REVIEW_MODEL": "gemini-2.5-pro"}):
            llm.GEMINI_API_KEY = "AIzaSyFakeKey"
            llm.REVIEW_MODEL = "gemini-2.5-pro"
            result = llm.call_review("Review manuscript")
            self.assertEqual(result, "5 stars review")
            mock_gemini.assert_called_once()

    @patch("llm.call_judge")
    def test_evaluate_json_parsing(self, mock_judge):
        import evaluate
        mock_judge.return_value = '```json\n{"overall_score": 8.2, "lore_score": 7.9}\n```'
        raw = evaluate.call_judge("test prompt")
        parsed = evaluate.parse_json_response(raw)
        self.assertEqual(parsed["overall_score"], 8.2)
        self.assertEqual(parsed["lore_score"], 7.9)


class TestScriptImports(unittest.TestCase):

    def test_script_modules_importable(self):
        scripts = [
            "seed", "gen_world", "gen_characters", "gen_outline",
            "gen_outline_part2", "gen_canon", "draft_chapter",
            "gen_revision", "evaluate", "adversarial_edit",
            "compare_chapters", "reader_panel", "review",
            "build_arc_summary", "build_outline", "gen_art_directions",
            "gen_art", "gen_audiobook_script", "run_pipeline"
        ]
        for s in scripts:
            with self.subTest(script=s):
                mod = __import__(s)
                self.assertIsNotNone(mod)


if __name__ == "__main__":
    unittest.main()
