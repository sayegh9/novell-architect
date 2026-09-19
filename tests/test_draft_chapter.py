import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class DraftChapterSmokeTests(unittest.TestCase):
    def _draft_once(self, language: str, novel_type: str) -> tuple[str, str, Path]:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir)
            prompt_dir = project_dir / "prompts" / language
            prompt_dir.mkdir(parents=True)
            (prompt_dir / "writer_system.txt").write_text(
                "system prompt", encoding="utf-8"
            )
            (prompt_dir / "draft_segment.txt").write_text(
                "{target_length_instruction}\n{current_beats}", encoding="utf-8"
            )
            (project_dir / "outline.md").write_text(
                "# Chapter 1: Opening\n- The protagonist arrives.\n",
                encoding="utf-8",
            )
            (project_dir / "seed.txt").write_text("A seed", encoding="utf-8")

            environment = {
                "AUTONOVEL_PROJECT_DIR": str(project_dir),
                "AUTONOVEL_LANGUAGE": language,
                "AUTONOVEL_NOVEL_TYPE": novel_type,
            }
            module_names = ("draft_chapter", "language_utils", "llm")
            previous_modules = {
                name: sys.modules.get(name) for name in module_names
            }
            try:
                with patch.dict(os.environ, environment, clear=False):
                    for api_key in (
                        "GEMINI_API_KEY",
                        "GOOGLE_API_KEY",
                        "ANTHROPIC_API_KEY",
                    ):
                        os.environ.pop(api_key, None)
                    for module_name in module_names:
                        sys.modules.pop(module_name, None)

                    draft_chapter = importlib.import_module("draft_chapter")
                    prompts = []

                    def fake_writer(prompt, system_prompt, max_tokens=16000):
                        prompts.append(prompt)
                        if language == "ar":
                            return "# الفصل 1\n\nهذا نص عربي تجريبي مكتوب بلا اتصال بالشبكة."
                        return "# Chapter 1\n\nOffline English draft text."

                    draft_chapter.call_writer = fake_writer
                    with patch.object(sys, "argv", ["draft_chapter.py", "1"]):
                        draft_chapter.main()
            except (ImportError, IndentationError, SyntaxError) as exc:
                self.fail(f"draft_chapter must import before it can draft: {exc}")
            finally:
                for module_name in module_names:
                    sys.modules.pop(module_name, None)
                    previous_module = previous_modules[module_name]
                    if previous_module is not None:
                        sys.modules[module_name] = previous_module

            chapter_path = project_dir / "chapters" / "ch_01.md"
            chapter_text = chapter_path.read_text(encoding="utf-8")
            prompt = "\n".join(prompts)
            self.assertEqual(draft_chapter.BASE_DIR, project_dir.resolve())
            self.assertFalse((project_dir / "state.json").exists())
            return prompt, chapter_text, chapter_path

    def test_drafts_offline_with_language_and_length_specific_instructions(self):
        cases = (
            ("en", "novel", "Target 800 to 1200 words", "Offline English draft text."),
            ("en", "novella", "Target 600 to 800 words", "Offline English draft text."),
            ("ar", "novel", "ما بين 800 إلى 1200 كلمة", "هذا نص عربي تجريبي"),
            ("ar", "novella", "ما بين 600 إلى 800 كلمة", "هذا نص عربي تجريبي"),
        )

        for language, novel_type, instruction, expected_text in cases:
            with self.subTest(language=language, novel_type=novel_type):
                prompt, chapter_text, chapter_path = self._draft_once(
                    language, novel_type
                )
                self.assertIn(instruction, prompt)
                self.assertIn(expected_text, chapter_text)
                self.assertEqual(chapter_path.name, "ch_01.md")


if __name__ == "__main__":
    unittest.main()
