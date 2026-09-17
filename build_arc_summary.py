#!/usr/bin/env python3
"""
Build a condensed arc summary for full-novel evaluation.
For each chapter: first 150 words, last 150 words, plus any dialogue.
Gives the reader panel enough to evaluate the ARC without 72k tokens.
"""
import os
import sys
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import detect_project_language

CHAPTERS_DIR = BASE_DIR / "chapters"

SYSTEM_PROMPT = "You summarize novel chapters precisely. State what HAPPENS, what CHANGES, and what QUESTIONS are left open. No evaluation. No praise. Just events and shifts."

def call_writer(prompt, max_tokens=1000):
    return _call_writer(prompt, system=SYSTEM_PROMPT, max_tokens=max_tokens, temperature=0.2, timeout=120)


def extract_key_passages(text):
    """Get opening, closing, and best dialogue from a chapter."""
    words = text.split()
    opening = ' '.join(words[:150]) if words else ""
    closing = ' '.join(words[-150:]) if words else ""
    
    # Extract dialogue lines (supports English quotes, smart quotes, Arabic brackets)
    dialogue = re.findall(r'[""«“]([^""»”]{15,})[""»”]', text)
    if not dialogue:
        dialogue = [line.strip() for line in text.splitlines() if line.strip().startswith(('«', '"', '“', '—', '-')) and len(line.strip()) > 20]
    
    dialogue.sort(key=len, reverse=True)
    top_dialogue = dialogue[:3]
    
    return opening, closing, top_dialogue


def summarize_single_chapter(path: Path):
    match = re.search(r"ch_(\d+)", path.name)
    ch = int(match.group(1)) if match else 0
    text = path.read_text(encoding="utf-8")
    wc = len(text.split())
    opening, closing, dialogue = extract_key_passages(text)
    
    # Send roughly the first 2000 words instead of 4000 characters
    truncated_text = ' '.join(text.split()[:2000])
    
    lang = detect_project_language()
    if lang == "ar":
        prompt = f"لخّص هذا الفصل في 3 جمل محددة بدقة: ماذا حدث، ما التحول الذي طرأ على الشخصيات، وما التساؤل المفتوح.\n\nالفصل {ch}:\n{truncated_text}"
    else:
        prompt = f"Summarize this chapter in exactly 3 sentences. What happens, what changes, what question is left open.\n\nCHAPTER {ch}:\n{truncated_text}"

    summary = call_writer(prompt, max_tokens=250)
    
    entry = f"""### Chapter {ch} ({wc} words)
**Summary:** {summary.strip()}

**Opening:** {opening}...

**Closing:** ...{closing}

**Key dialogue:**
"""
    for d in dialogue:
        entry += f'> "{d}"\n\n'
    
    print(f"  ✓ Ch {ch}: summarized ({wc}w)", flush=True)
    return ch, entry, wc


def main():
    chapter_files = sorted(CHAPTERS_DIR.glob("ch_*.md"))
    if not chapter_files:
        print("WARNING: No chapter files found in chapters/. Cannot build arc summary.", file=sys.stderr, flush=True)
        return

    print(f"Building arc summary for {len(chapter_files)} chapters...", flush=True)

    summaries_dict = {}
    total_wc = 0

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(summarize_single_chapter, path): path for path in chapter_files}
        for future in as_completed(futures):
            try:
                ch, entry, wc = future.result()
                summaries_dict[ch] = entry
                total_wc += wc
            except Exception as e:
                print(f"  ✗ Error summarizing chapter: {e}", file=sys.stderr, flush=True)

    # Sort in chapter order
    ordered_summaries = [summaries_dict[ch] for ch in sorted(summaries_dict.keys())]

    # Read premise from seed.txt or outline.md if available
    seed_file = BASE_DIR / "seed.txt"
    premise = seed_file.read_text(encoding="utf-8") if seed_file.exists() else "Full Novel Draft"

    title = "Novel Manuscript"
    outline_file = BASE_DIR / "outline.md"
    if outline_file.exists():
        first_line = outline_file.read_text(encoding="utf-8").split("\n")[0]
        title = first_line.lstrip("# ").strip() or title

    full = f"""# {title}
## Full-Arc Summary for Reader Panel

This document contains chapter summaries, opening/closing passages,
and key dialogue for all {len(ordered_summaries)} chapters. Total novel: {total_wc:,} words.

PREMISE:
{premise}

---

"""
    full += '\n---\n\n'.join(ordered_summaries)
    
    out_path = BASE_DIR / "arc_summary.md"
    out_path.write_text(full, encoding="utf-8")
    print(f"\nSaved arc summary to {out_path} ({len(full.split())} words)", flush=True)


if __name__ == "__main__":
    main()

