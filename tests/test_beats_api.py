import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import server


OUTLINE = """# Story Outline

Opening notes stay untouched.

## Chapter 1: Arrival
- The traveler reaches القاهرة.
- A locked gate blocks the road.

### Character note
She refuses to turn back.

---

## Ch 2: The Bargain
- The gatekeeper names a price.

## Appendix
Closing notes stay untouched.
"""


class ChapterBeatsApiTests(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.project_dir = Path(self._temp_dir.name)
        self.original_project_dir = server.PROJECT_DIR
        server.PROJECT_DIR = self.project_dir
        self.client = TestClient(server.app)

    def tearDown(self):
        server.PROJECT_DIR = self.original_project_dir
        self._temp_dir.cleanup()

    def write_outline(self, content: str = OUTLINE) -> Path:
        path = self.project_dir / "outline.md"
        path.write_text(content, encoding="utf-8")
        return path

    def test_get_returns_the_selected_utf8_section_and_explicit_contract(self):
        self.write_outline()

        response = self.client.get("/api/chapters/1/beats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "chapter": 1,
                "title": "Chapter 1: Arrival",
                "beats": (
                    "## Chapter 1: Arrival\n"
                    "- The traveler reaches القاهرة.\n"
                    "- A locked gate blocks the road.\n\n"
                    "### Character note\n"
                    "She refuses to turn back."
                ),
                "exists": True,
            },
        )

    def test_post_replaces_only_one_section_and_creates_recoverable_backup(self):
        outline_path = self.write_outline()
        replacement = """## Chapter 1: New Arrival
- A different choice is made in الإسكندرية.

### Consequence
The gate opens.
"""
        untouched_suffix = OUTLINE[OUTLINE.index("## Ch 2: The Bargain") :]

        response = self.client.post(
            "/api/chapters/1/beats", json={"beats": replacement}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "saved")
        self.assertEqual(payload["chapter"], 1)
        self.assertEqual(payload["beats"], replacement.strip())
        self.assertRegex(
            payload["backup"],
            r"^outline_backups/outline_\d{8}_\d{6}_\d{6}\.md$",
        )

        backup_path = self.project_dir / payload["backup"]
        self.assertTrue(backup_path.is_file())
        self.assertEqual(backup_path.read_text(encoding="utf-8"), OUTLINE)

        updated_outline = outline_path.read_text(encoding="utf-8")
        self.assertTrue(updated_outline.startswith(OUTLINE[: OUTLINE.index("## Chapter 1")]))
        self.assertEqual(
            updated_outline[updated_outline.index("## Ch 2: The Bargain") :],
            untouched_suffix,
        )
        self.assertNotIn("A locked gate blocks the road", updated_outline)

        reloaded = self.client.get("/api/chapters/1/beats")
        self.assertEqual(reloaded.status_code, 200)
        self.assertEqual(reloaded.json()["beats"], replacement.strip())

    def test_invalid_chapter_number_is_rejected_without_touching_outline(self):
        outline_path = self.write_outline()

        response = self.client.post(
            "/api/chapters/0/beats",
            json={"beats": "## Chapter 0: Invalid\n- No."},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("positive", response.json()["detail"])
        self.assertEqual(outline_path.read_text(encoding="utf-8"), OUTLINE)

    def test_missing_outline_and_missing_section_return_not_found(self):
        missing_outline = self.client.get("/api/chapters/1/beats")
        self.assertEqual(missing_outline.status_code, 404)
        self.assertIn("outline.md", missing_outline.json()["detail"])

        self.write_outline()
        missing_section = self.client.post(
            "/api/chapters/9/beats",
            json={"beats": "## Chapter 9: Missing\n- No section exists."},
        )
        self.assertEqual(missing_section.status_code, 404)
        self.assertIn("Chapter 9", missing_section.json()["detail"])
        self.assertFalse((self.project_dir / "outline_backups").exists())

    def test_invalid_replacement_content_returns_422_without_backup_or_write(self):
        outline_path = self.write_outline()

        cases = (
            ("", "must not be empty"),
            ("- A heading-free list item", "heading"),
            ("## Chapter 2: Wrong chapter\n- Wrong.", "Chapter 1"),
            (
                "## Chapter 1: Duplicate\n- First.\n## Chapter 1: Again\n- Second.",
                "exactly one",
            ),
        )
        for beats, expected_detail in cases:
            with self.subTest(beats=beats):
                response = self.client.post(
                    "/api/chapters/1/beats", json={"beats": beats}
                )
                self.assertEqual(response.status_code, 422)
                self.assertIn(expected_detail, response.json()["detail"])
                self.assertEqual(outline_path.read_text(encoding="utf-8"), OUTLINE)
                self.assertFalse((self.project_dir / "outline_backups").exists())


if __name__ == "__main__":
    unittest.main()
