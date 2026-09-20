#!/usr/bin/env python3
"""
Revision chapter generator. Rewrites a chapter from a specific revision brief.
Supports Arabic and English novel pipelines dynamically.
Usage: python gen_revision.py <chapter_num> [brief_file]
"""
import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import clean_chapter_text, detect_project_language, load_prompt

CHAPTERS_DIR = BASE_DIR / "chapters"
BRIEFS_DIR = BASE_DIR / "briefs"

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.75, timeout=600)

def main():
    if len(sys.argv) < 2:
        print("Usage: python gen_revision.py <chapter_num> [brief_file]", file=sys.stderr)
        sys.exit(1)

    ch_num = int(sys.argv[1])
    
    # Determine brief file
    if len(sys.argv) >= 3:
        brief_path = Path(sys.argv[2])
    else:
        # Default brief path
        brief_path = BRIEFS_DIR / f"ch_{ch_num:02d}_brief.md"
        if not brief_path.exists():
            # Try unpadded
            brief_path = BRIEFS_DIR / f"ch{ch_num:02d}_brief.md"
    
    brief_content = ""
    if brief_path.exists():
        brief_content = brief_path.read_text(encoding="utf-8")
    else:
        brief_content = f"Targeted revision for Chapter {ch_num}: Fix pacing, eliminate fat, tighten emotional resonance."

    voice = (BASE_DIR / "voice.md").read_text(encoding="utf-8") if (BASE_DIR / "voice.md").exists() else ""
    characters = (BASE_DIR / "characters.md").read_text(encoding="utf-8") if (BASE_DIR / "characters.md").exists() else ""
    world = (BASE_DIR / "world.md").read_text(encoding="utf-8") if (BASE_DIR / "world.md").exists() else ""
    
    # Load adjacent chapters for continuity
    prev_path = CHAPTERS_DIR / f"ch_{ch_num - 1:02d}.md"
    next_path = CHAPTERS_DIR / f"ch_{ch_num + 1:02d}.md"
    prev_tail = prev_path.read_text(encoding="utf-8")[-2000:] if prev_path.exists() else "(first chapter)"
    next_head = next_path.read_text(encoding="utf-8")[:1500] if next_path.exists() else "(last chapter)"
    
    # Load old version if exists
    old_path = CHAPTERS_DIR / f"ch_{ch_num:02d}.md"
    old_text = old_path.read_text(encoding="utf-8") if old_path.exists() else "(no existing draft)"

    system_prompt = load_prompt("writer_system")
    prompt_template = load_prompt("revision_prompt")
    prompt = prompt_template.format(
        ch_num=ch_num,
        brief_content=brief_content,
        old_text=old_text,
        world=world,
        characters=characters,
        voice=voice,
        prev_tail=prev_tail
    )

    lang = detect_project_language()
    is_arabic = (lang == "ar")

    print(f"Calling writer model for Chapter {ch_num} revision (Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    revised_text = call_writer(prompt, system_prompt=system_prompt)
    
    # Clean up formatting wrappers and conversational preambles
    revised_text = clean_chapter_text(revised_text, chapter_num=ch_num)
    
    out_path = CHAPTERS_DIR / f"ch_{ch_num:02d}.md"
    out_path.write_text(revised_text, encoding="utf-8")
    
    words = len(revised_text.split())
    print(f"Chapter {ch_num} revised successfully: {words} words -> {out_path}")

if __name__ == "__main__":
    main()
