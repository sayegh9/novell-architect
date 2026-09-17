#!/usr/bin/env python3
"""
Adversarial editing pass: ask the judge to CUT 500 words from each chapter.
What gets cut reveals what's weakest. The cut list IS the revision plan.

Usage: python adversarial_edit.py 1        # single chapter
       python adversarial_edit.py all      # all chapters
"""
import os
import sys
import json
import re
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_judge as _call_judge
CHAPTERS_DIR = BASE_DIR / "chapters"
EDIT_LOG_DIR = BASE_DIR / "edit_logs"
EDIT_LOG_DIR.mkdir(exist_ok=True)

SYSTEM_PROMPT = (
    "You are a ruthless literary editor. You cut fat from prose. "
    "You have no sentiment about good-enough sentences -- if a sentence "
    "isn't earning its place, it goes. You quote exactly from the text. "
    "You never invent or paraphrase. Always respond with valid JSON."
)

def call_judge(prompt, max_tokens=8000):
    return _call_judge(prompt, system=SYSTEM_PROMPT, max_tokens=max_tokens, temperature=0.3, timeout=300)


def parse_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r'^```\w*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
    
    # Extract outermost JSON block
    m = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
    candidate = m.group(0) if m else text

    try:
        return json.loads(candidate, strict=False)
    except Exception:
        pass

    try:
        # Remove trailing commas
        cleaned = re.sub(r',\s*([\}\]])', r'\1', candidate)
        return json.loads(cleaned, strict=False)
    except Exception:
        pass

    start = text.find('{')
    if start != -1:
        end = text.rfind('}')
        if end > start:
            try:
                return json.loads(text[start:end+1], strict=False)
            except Exception:
                pass

    return {
        "cuts": [],
        "total_cuttable_words": 0,
        "overall_fat_percentage": 0,
        "one_sentence_verdict": text[:300].strip()
    }

EDIT_PROMPT = """You are editing a fantasy novel chapter. Your job: identify exactly
what to cut or rewrite to make this chapter tighter, sharper, more alive.

THE CHAPTER ({word_count} words):
{chapter_text}

YOUR TASK:
1. Find 10-20 specific passages that should be CUT or REWRITTEN.
   For each, quote the EXACT text (minimum 10 words of the quote so
   it's unambiguous), explain why it's weak, and classify it.

2. Classify each cut as one of:
   - FAT: adds nothing, could be removed with no loss
   - REDUNDANT: restates what a previous sentence/scene already showed
   - OVER-EXPLAIN: narrator explaining what the scene already demonstrated
   - GENERIC: could appear in any novel, not specific to this world/character
   - TELL: names an emotion or state instead of showing it
   - STRUCTURAL: paragraph/section that disrupts pacing or rhythm

3. For REWRITE candidates (not cuts), provide a specific revision.

4. Estimate how many words could be cut total without losing anything
   the chapter needs.

Respond with JSON:
{{
  "cuts": [
    {{
      "quote": "exact text from the chapter (10+ words)",
      "type": "FAT|REDUNDANT|OVER-EXPLAIN|GENERIC|TELL|STRUCTURAL",
      "reason": "why this should go",
      "action": "CUT or REWRITE",
      "rewrite": "replacement text if action is REWRITE, null if CUT"
    }}
  ],
  "total_cuttable_words": N,
  "tightest_passage": "quote the best 2-3 sentences in the chapter -- the ones you'd never touch",
  "loosest_passage": "quote the worst 2-3 sentences -- the ones that most need work",
  "overall_fat_percentage": N,
  "one_sentence_verdict": "what this chapter does well and what drags it down, in one sentence"
}}
"""

def edit_chapter(ch_num):
    ch_path = CHAPTERS_DIR / f"ch_{ch_num:02d}.md"
    text = ch_path.read_text(encoding="utf-8")
    word_count = len(text.split())
    
    print(f"  [AI Editor] Reading Chapter {ch_num} ({word_count} words)...", flush=True)
    prompt = EDIT_PROMPT.format(chapter_text=text, word_count=word_count)
    print(f"  [AI Editor] Analyzing prose for cuts and fat percentage...", flush=True)
    raw = call_judge(prompt)
    result = parse_json(raw)
    
    # Save log
    log_path = EDIT_LOG_DIR / f"ch{ch_num:02d}_cuts.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    return result, word_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python adversarial_edit.py <chapter_num|all>")
        sys.exit(1)
    
    if sys.argv[1] == "all":
        existing_files = sorted(CHAPTERS_DIR.glob("ch_*.md"))
        if not existing_files:
            print("WARNING: No chapter files found in chapters/ to edit.")
            return
        chapters = []
        for f in existing_files:
            m = re.search(r"ch_(\d+)", f.name)
            if m:
                chapters.append(int(m.group(1)))
    else:
        ch = int(sys.argv[1])
        ch_path = CHAPTERS_DIR / f"ch_{ch:02d}.md"
        if not ch_path.exists():
            print(f"ERROR: Chapter file {ch_path.name} not found.")
            return
        chapters = [ch]
    
    for ch in chapters:
        print(f"\n{'='*50}")
        print(f"EDITING CH {ch}")
        print(f"{'='*50}")
        
        try:
            result, wc = edit_chapter(ch)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue

        
        cuts = result.get("cuts", [])
        cuttable = result.get("total_cuttable_words", 0)
        fat_pct = result.get("overall_fat_percentage", 0)
        verdict = result.get("one_sentence_verdict", "")
        
        # Count by type
        type_counts = {}
        for c in cuts:
            t = c.get("type", "?")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        print(f"  Words: {wc}")
        print(f"  Cuts found: {len(cuts)}")
        print(f"  Cuttable words: ~{cuttable} ({fat_pct}% fat)")
        print(f"  By type: {type_counts}")
        print(f"  Verdict: {verdict}")
        print(f"  Tightest: {result.get('tightest_passage', '')[:100]}...")
        print(f"  Loosest:  {result.get('loosest_passage', '')[:100]}...")

if __name__ == "__main__":
    main()
