#!/usr/bin/env python3
"""
Build a condensed arc summary for full-novel evaluation.
For each chapter: first 150 words, last 150 words, plus any dialogue.
Gives the reader panel enough to evaluate the ARC without 72k tokens.
"""
import os
import re
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
CHAPTERS_DIR = BASE_DIR / "chapters"

SYSTEM_PROMPT = "You summarize novel chapters precisely. State what HAPPENS, what CHANGES, and what QUESTIONS are left open. No evaluation. No praise. Just events and shifts."

def call_writer(prompt, max_tokens=4000):
    return _call_writer(prompt, system=SYSTEM_PROMPT, max_tokens=max_tokens, temperature=0.1, timeout=120)


def extract_key_passages(text):
    """Get opening, closing, and best dialogue from a chapter."""
    words = text.split()
    opening = ' '.join(words[:150])
    closing = ' '.join(words[-150:])
    
    # Extract dialogue lines
    dialogue = re.findall(r'["""]([^"""]{20,})["""]', text)
    # Pick up to 3 longest dialogue lines
    dialogue.sort(key=len, reverse=True)
    top_dialogue = dialogue[:3]
    
    return opening, closing, top_dialogue

def main():
    chapter_files = sorted(CHAPTERS_DIR.glob("ch_*.md"))
    if not chapter_files:
        print("WARNING: No chapter files found in chapters/. Cannot build arc summary.", file=sys.stderr)
        return

    summaries = []
    total_wc = 0

    for path in chapter_files:
        match = re.search(r"ch_(\d+)", path.name)
        ch = int(match.group(1)) if match else 0
        text = path.read_text()
        wc = len(text.split())
        total_wc += wc
        opening, closing, dialogue = extract_key_passages(text)
        
        # Get a 100-word summary from the model
        summary = call_writer(
            f"Summarize this chapter in exactly 3 sentences. What happens, what changes, what question is left open.\n\nCHAPTER {ch}:\n{text}",
            max_tokens=200
        )
        
        entry = f"""### Chapter {ch} ({wc} words)
**Summary:** {summary}

**Opening:** {opening}...

**Closing:** ...{closing}

**Key dialogue:**
"""
        for d in dialogue:
            entry += f'> "{d}"\n\n'
        
        summaries.append(entry)
        print(f"Ch {ch}: summarized ({wc}w)")

    # Read premise from seed.txt if available
    seed_file = BASE_DIR / "seed.txt"
    premise = seed_file.read_text() if seed_file.exists() else "Fantasy novel"

    # Assemble
    full = f"""# THE SECOND SON OF THE HOUSE OF BELLS
## Full-Arc Summary for Reader Panel

This document contains chapter summaries, opening/closing passages,
and key dialogue for all {len(chapter_files)} chapters. Total novel: {total_wc:,} words.

PREMISE:
{premise}

---

"""
    full += '\n---\n\n'.join(summaries)
    
    out_path = BASE_DIR / "arc_summary.md"
    out_path.write_text(full)
    print(f"\nSaved to {out_path} ({len(full.split())} words)")


if __name__ == "__main__":
    main()
