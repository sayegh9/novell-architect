import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
OUTLINE = """# Novel Outline

## Chapter 1: Arrival
- A traveler reaches the city.

## Chapter 2: The Bargain
- The gatekeeper names a price.
"""
GENERATED_BEATS = """## Chapter 1: Arrival

### Chapter Intent
Force Nara to choose whether to trust the gatekeeper.

### Scene Beats
1. Nara reaches the locked gate before dusk.
2. The gatekeeper recognizes the silver key.
3. The bell sounds and changes the price.

### Closing Hook
The gate opens onto an empty city.
"""


class GenerateChapterBeatsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.project_dir = Path(self.temp_dir.name)
        self.provider_dir = self.project_dir / "offline_provider"
        self.provider_dir.mkdir()
        provider = f'''import json
import os
import types
from pathlib import Path

project = Path(os.environ["AUTONOVEL_PROJECT_DIR"])
llm = types.ModuleType("llm")
def writer(prompt, system="", **kwargs):
    (project / "observed_beats_prompt.json").write_text(
        json.dumps({{"prompt": prompt, "system": system}}), encoding="utf-8"
    )
    return {GENERATED_BEATS!r}
llm.call_writer = writer
import sys
sys.modules["llm"] = llm
'''
        (self.provider_dir / "sitecustomize.py").write_text(provider, encoding="utf-8")
        self.environment = {
            key: value for key, value in os.environ.items()
            if not key.endswith("API_KEY") and not key.startswith("AUTONOVEL_")
        }
        self.environment.update({
            "AUTONOVEL_PROJECT_DIR": str(self.project_dir),
            "AUTONOVEL_LANGUAGE": "en",
            "PYTHONPATH": str(self.provider_dir),
            "PYTHON_DOTENV_DISABLED": "1",
        })

    def run_generator(self, chapter: int = 1):
        return subprocess.run(
            [sys.executable, str(APP_DIR / "generate_chapter_beats.py"), str(chapter)],
            cwd=self.project_dir,
            env=self.environment,
            capture_output=True,
            text=True,
            timeout=15,
        )

    def test_generation_uses_foundation_context_and_replaces_only_selected_chapter(self):
        documents = {
            "seed.txt": "SEED: A traveler follows a vanished bell.",
            "world.md": "WORLD: The city gates close at dusk.",
            "characters.md": "CHARACTERS: Nara distrusts gatekeepers.",
            "canon.md": "CANON: The silver key cannot be copied.",
            "voice.md": "VOICE: Restrained close third person.",
            "outline.md": OUTLINE,
        }
        for filename, content in documents.items():
            (self.project_dir / filename).write_text(content, encoding="utf-8")

        result = self.run_generator()

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(
            (self.project_dir / "observed_beats_prompt.json").read_text(encoding="utf-8")
        )
        for marker in (
            "SEED: A traveler follows a vanished bell.",
            "WORLD: The city gates close at dusk.",
            "CHARACTERS: Nara distrusts gatekeepers.",
            "CANON: The silver key cannot be copied.",
            "VOICE: Restrained close third person.",
            "## Chapter 1: Arrival",
            "## Chapter 2: The Bargain",
        ):
            self.assertIn(marker, observed["prompt"])

        updated_outline = (self.project_dir / "outline.md").read_text(encoding="utf-8")
        self.assertIn("### Chapter Intent", updated_outline)
        self.assertIn("## Chapter 2: The Bargain\n- The gatekeeper names a price.", updated_outline)
        backups = list((self.project_dir / "outline_backups").glob("outline_*.md"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_text(encoding="utf-8"), OUTLINE)

    def test_generation_rejects_missing_foundation_without_writing(self):
        (self.project_dir / "outline.md").write_text(OUTLINE, encoding="utf-8")

        result = self.run_generator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("seed.txt", result.stdout + result.stderr)
        self.assertEqual(
            (self.project_dir / "outline.md").read_text(encoding="utf-8"), OUTLINE
        )
        self.assertFalse((self.project_dir / "outline_backups").exists())


if __name__ == "__main__":
    unittest.main()
