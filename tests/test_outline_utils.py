import importlib
import importlib.util
import os
import sys
import tempfile
import unittest
from unittest.mock import patch


def load_outline_utils():
    spec = importlib.util.find_spec("outline_utils")
    if spec is None:
        raise AssertionError("outline_utils must provide the shared chapter-outline API")
    return importlib.import_module("outline_utils")


class OutlineExtractionTests(unittest.TestCase):
    def test_extracts_english_numeric_chapter_without_next_chapter(self):
        outline_utils = load_outline_utils()
        outline = """# Act One
## Chapter 1: Arrival
- The gate opens.
- Mara enters.
## Chapter 2: Consequences
- The gate closes.
"""

        result = outline_utils.extract_chapter_outline(outline, 1)

        self.assertEqual(
            result,
            "## Chapter 1: Arrival\n- The gate opens.\n- Mara enters.",
        )

    def test_extracts_arabic_numeric_chapter(self):
        outline_utils = load_outline_utils()
        outline = """# المخطط
## الفصل ٢: العبور
- تعبر سلمى البوابة.
## الفصل ٣: العودة
- تعود سلمى إلى البيت.
"""

        result = outline_utils.extract_chapter_outline(outline, 2)

        self.assertEqual(result, "## الفصل ٢: العبور\n- تعبر سلمى البوابة.")

    def test_extracts_arabic_word_number_chapter(self):
        outline_utils = load_outline_utils()
        outline = """# المخطط
### الفصل الحادي عشر: الرسالة
#### النبضات
- تصل الرسالة عند الفجر.
### الفصل الثاني عشر: القرار
- يفتح البطل الرسالة.
"""

        result = outline_utils.extract_chapter_outline(outline, 11)

        self.assertEqual(
            result,
            "### الفصل الحادي عشر: الرسالة\n#### النبضات\n- تصل الرسالة عند الفجر.",
        )

    def test_returns_stable_fallback_when_chapter_is_missing(self):
        outline_utils = load_outline_utils()

        result = outline_utils.extract_chapter_outline("# Story Outline", 7)

        self.assertEqual(result, "Chapter 7 beats from outline")

    def test_extracts_next_chapter(self):
        outline_utils = load_outline_utils()
        outline = """## Ch 4: A Choice
- A choice is made.
## Ch 5: Its Cost
- The cost arrives.
"""

        result = outline_utils.extract_next_chapter_outline(outline, 4)

        self.assertEqual(result, "## Ch 5: Its Cost\n- The cost arrives.")

    def test_reports_final_chapter_when_no_later_chapter_exists(self):
        outline_utils = load_outline_utils()
        outline = """## Chapter 24: The End
- The final choice is made.
# Appendix
Reference notes.
"""

        result = outline_utils.extract_next_chapter_outline(outline, 24)

        self.assertEqual(
            result,
            "This is the final chapter; there is no next chapter outline.",
        )

    def test_both_drafting_scripts_import_the_shared_helpers(self):
        module_names = (
            "draft_chapter",
            "rewrite_chapter_beats",
            "language_utils",
            "llm",
        )
        previous_modules = {name: sys.modules.get(name) for name in module_names}
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                with patch.dict(
                    os.environ, {"AUTONOVEL_PROJECT_DIR": temp_dir}, clear=False
                ):
                    for module_name in module_names:
                        sys.modules.pop(module_name, None)

                    draft_chapter = importlib.import_module("draft_chapter")
                    rewrite_chapter_beats = importlib.import_module(
                        "rewrite_chapter_beats"
                    )
            except ImportError as exc:
                self.fail(f"rewrite_chapter_beats must import successfully: {exc}")
            finally:
                for module_name in module_names:
                    sys.modules.pop(module_name, None)
                    previous_module = previous_modules[module_name]
                    if previous_module is not None:
                        sys.modules[module_name] = previous_module

        outline = """## Chapter 1: Start
- Begin.
## Chapter 2: Continue
- Continue.
"""
        self.assertEqual(
            draft_chapter.extract_next_chapter_outline(outline, 1),
            "## Chapter 2: Continue\n- Continue.",
        )
        self.assertEqual(
            rewrite_chapter_beats.extract_chapter_outline(outline, 1),
            "## Chapter 1: Start\n- Begin.",
        )


if __name__ == "__main__":
    unittest.main()
