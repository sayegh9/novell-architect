#!/usr/bin/env python3
"""
Generate outline.md from seed + world + characters + mystery + craft.
Supports Arabic and English dynamically.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import detect_project_language

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.5, timeout=600)

def main():
    seed_file = BASE_DIR / "seed.txt"
    if not seed_file.exists():
        print("ERROR: seed.txt not found. Create or generate seed.txt first.", file=sys.stderr)
        sys.exit(1)

    seed = seed_file.read_text(encoding="utf-8")
    world = (BASE_DIR / "world.md").read_text(encoding="utf-8") if (BASE_DIR / "world.md").exists() else ""
    characters = (BASE_DIR / "characters.md").read_text(encoding="utf-8") if (BASE_DIR / "characters.md").exists() else ""
    mystery = (BASE_DIR / "MYSTERY.md").read_text(encoding="utf-8") if (BASE_DIR / "MYSTERY.md").exists() else ""
    voice = (BASE_DIR / "voice.md").read_text(encoding="utf-8") if (BASE_DIR / "voice.md").exists() else ""


    lang = detect_project_language()
    novel_type = os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel")
    
    prompt_file = "outline_prompt_novella.txt" if novel_type == "novella" else "outline_prompt.txt"
    sys_file = "outline_system.txt"
    
    sys_path = Path(__file__).resolve().parent / "prompts" / lang / sys_file
    prompt_path = Path(__file__).resolve().parent / "prompts" / lang / prompt_file
    
    if not sys_path.exists() or not prompt_path.exists():
        print(f"ERROR: Prompt files missing for {lang} ({novel_type})", file=sys.stderr)
        sys.exit(1)
        
    system_prompt = sys_path.read_text(encoding="utf-8")
    prompt_template = prompt_path.read_text(encoding="utf-8")
    
    prompt = prompt_template.format(
        seed=seed,
        world=world,
        characters=characters,
        mystery=mystery,
        voice=voice
    )

    print(f"Generating outline.md (Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    content = call_writer(prompt, system_prompt=system_prompt)
    
    content = content.strip()
    if content.startswith("```markdown"):
        content = content[11:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    (BASE_DIR / "outline.md").write_text(content, encoding="utf-8")
    print(f"outline.md written successfully ({len(content.split())} words)")

if __name__ == "__main__":
    main()
