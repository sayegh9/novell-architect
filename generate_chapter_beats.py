#!/usr/bin/env python3
"""Generate and save a structured beat sheet for one outlined chapter."""

import argparse
import os
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(
    os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)
).resolve()
load_dotenv(BASE_DIR / ".env", override=True)

from file_utils import atomic_write_text
from language_utils import load_prompt
from llm import call_writer as _call_writer
from outline_utils import find_chapter_outline


REQUIRED_DOCUMENTS = (
    "seed.txt",
    "world.md",
    "characters.md",
    "canon.md",
    "voice.md",
    "outline.md",
)


def call_writer(prompt: str, system_prompt: str, max_tokens: int = 8000) -> str:
    return _call_writer(
        prompt,
        system=system_prompt,
        max_tokens=max_tokens,
        temperature=0.45,
        timeout=300,
    )


def _load_required_documents() -> dict[str, str]:
    documents = {}
    for filename in REQUIRED_DOCUMENTS:
        path = BASE_DIR / filename
        if not path.is_file():
            raise FileNotFoundError(f"Required foundation document not found: {filename}")
        content = path.read_text(encoding="utf-8")
        if not content.strip():
            raise ValueError(f"Required foundation document is empty: {filename}")
        documents[filename] = content
    return documents


def _clean_generated_beats(text: str, original_section: str) -> str:
    generated = text.strip()
    generated = re.sub(r"^```(?:markdown)?\s*", "", generated, flags=re.IGNORECASE)
    generated = re.sub(r"\s*```$", "", generated).strip()
    if not generated:
        raise ValueError("Writer returned an empty chapter beat sheet")

    original_heading = original_section.splitlines()[0].strip()
    lines = generated.splitlines()
    if lines and re.match(
        r"^#{1,6}\s+(?:\*{1,2})?\s*(?:Chapter|Ch|الفصل|فصل)\b",
        lines[0].strip(),
        flags=re.IGNORECASE,
    ):
        lines = lines[1:]
    body = "\n".join(lines).strip()
    if not body:
        raise ValueError("Writer returned a chapter heading without any beats")
    return f"{original_heading}\n\n{body}"


def generate_chapter_beats(chapter_num: int) -> str:
    if not 1 <= chapter_num <= 24:
        raise ValueError("Chapter number must be between 1 and 24")

    documents = _load_required_documents()
    outline = documents["outline.md"]
    current_section = find_chapter_outline(outline, chapter_num)
    if current_section is None:
        raise LookupError(f"Chapter {chapter_num} section not found in outline.md")

    previous_section = (
        find_chapter_outline(outline, chapter_num - 1)
        if chapter_num > 1
        else "(This is the opening chapter.)"
    )
    next_section = find_chapter_outline(outline, chapter_num + 1)
    if next_section is None:
        next_section = "(This is the final outlined chapter.)"

    prompt = load_prompt("chapter_beats").format(
        chapter_num=chapter_num,
        seed=documents["seed.txt"],
        world=documents["world.md"],
        characters=documents["characters.md"],
        canon=documents["canon.md"],
        voice=documents["voice.md"],
        outline=outline,
        current_chapter=current_section,
        previous_chapter=previous_section,
        next_chapter=next_section,
    )
    generated = call_writer(prompt, load_prompt("chapter_beats_system"))
    replacement = _clean_generated_beats(generated, current_section)

    from outline_utils import replace_chapter_outline

    updated_outline = replace_chapter_outline(outline, chapter_num, replacement)
    backup_dir = BASE_DIR / "outline_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    backup_path = backup_dir / f"outline_{timestamp}.md"
    atomic_write_text(backup_path, outline, newline="")
    atomic_write_text(BASE_DIR / "outline.md", updated_outline, newline="")

    print(
        f"Generated beats for Chapter {chapter_num}; backup: "
        f"{backup_path.relative_to(BASE_DIR)}",
        flush=True,
    )
    return replacement


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a structured beat sheet for one chapter"
    )
    parser.add_argument("chapter", type=int, help="Chapter number (1-24)")
    args = parser.parse_args()
    generate_chapter_beats(args.chapter)


if __name__ == "__main__":
    main()
