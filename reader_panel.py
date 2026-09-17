#!/usr/bin/env python3
"""
4-reader panel for full-arc novel evaluation.
Each reader has a distinct persona and evaluates the NOVEL, not individual chapters.
The disagreements between readers are where editorial decisions live.

Usage: python reader_panel.py
"""
import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_judge
from language_utils import detect_project_language

READERS = {
    "editor": {
        "name": "The Editor",
        "ar_name": "المحرر الأدبي",
        "system": (
            "You are a senior fiction editor at a major publishing house. "
            "You've edited 200+ novels. You care about prose texture, subtext, "
            "sentence-level craft, and whether the voice is consistent and earned. "
            "You notice when the narrator over-explains, when dialogue sounds "
            "written rather than spoken, when a metaphor is borrowed rather than "
            "earned. You are not cruel but you are precise. You've seen enough "
            "competent prose to know the difference between good and alive. "
            "Respond with valid JSON only."
        ),
    },
    "genre_reader": {
        "name": "The Genre Reader",
        "ar_name": "قارئ الفانتازيا والتشويق",
        "system": (
            "You are an avid fiction reader who reads 50+ novels a year. "
            "You care about pacing, mystery, worldbuilding payoff, and whether "
            "you want to keep turning pages. You get bored by beautiful prose "
            "that doesn't GO anywhere. You notice when an investigation stalls, "
            "when tension plateaus, when the author is more in love with their "
            "world than their story. You are generous with what you love and "
            "blunt about what bores you. Respond with valid JSON only."
        ),
    },
    "writer": {
        "name": "The Writer",
        "ar_name": "الكاتب الروائي",
        "system": (
            "You are a published author with multiple acclaimed novels. "
            "You read as a craftsperson. You notice structure: where the beats fall, "
            "whether foreshadowing pays off, whether character arcs complete. You "
            "notice when technique shows versus when it disappears into the story. "
            "The highest compliment you give is 'I forgot I was reading.' The worst "
            "thing you can say is 'I can see the outline.' You care about the gap "
            "between what a novel attempts and what it achieves. Respond with valid JSON only."
        ),
    },
    "first_reader": {
        "name": "The First Reader",
        "ar_name": "القارئ العام (الجمهور)",
        "system": (
            "You are a thoughtful general reader. Not a writer, not an editor, "
            "not a genre expert. You read for the experience. You know what you "
            "feel but not always why. You notice when you're moved, when you're "
            "bored, when you're confused, when you want to tell someone about "
            "what you just read. You don't use craft terminology. Your feedback is emotional "
            "and honest, not analytical. Respond with valid JSON only."
        ),
    },
}

READER_PROMPT = """You have just read a complete novel in summary form.
The summaries include chapter-by-chapter events, opening and closing passages from each chapter, and key dialogue.

{arc_summary}

Now answer these questions about the NOVEL AS A WHOLE. Be specific and quote passages or name chapter numbers where appropriate.
If the novel is in Arabic, respond in classical literary Arabic. If in English, respond in English.

Respond with valid JSON:
{{
  "momentum_loss": "Where does the story lose momentum? Name the specific chapter(s) and what causes the drag. If it never loses momentum, explain why.",
  "earned_ending": "Does the climax and ending feel earned by everything before it? What, if anything, feels unearned or rushed?",
  "cut_candidate": "If the novel had to be 10% shorter (~5,000-7,000 words), which chapter or section would you cut first and why?",
  "missing_scene": "Is there a scene the novel NEEDS that it doesn't have? A conversation that should happen, a moment that's earned but never delivered?",
  "thinnest_character": "Which character feels thinnest by the end? Who do you want to know more about?",
  "best_scene": "What's the single best scene in the novel? Quote the moment and explain why it works.",
  "worst_scene": "What's the single weakest scene? What goes wrong?",
  "would_recommend": "Would you recommend this novel? To whom? Give your 1-sentence verdict.",
  "haunts_you": "Is there a line or moment that stays with you after reading?",
  "next_book": "Would you read the author's next book? Why or why not?"
}}
"""

def parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```\w*\n?', '', raw)
        raw = re.sub(r'\n?```$', '', raw)
    start = raw.find('{')
    if start >= 0:
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(raw)):
            c = raw[i]
            if escape: escape = False; continue
            if c == '\\' and in_string: escape = True; continue
            if c == '"' and not escape: in_string = not in_string; continue
            if in_string: continue
            if c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(raw[start:i+1], strict=False)
                    except Exception:
                        pass
    return json.loads(raw, strict=False)


def call_single_reader(reader_key: str, arc_summary: str) -> tuple[str, dict]:
    reader = READERS[reader_key]
    print(f"  → Reader [{reader['name']}] analyzing novel arc...", flush=True)
    raw = call_judge(
        prompt=READER_PROMPT.format(arc_summary=arc_summary),
        system=reader["system"],
        max_tokens=4000,
        temperature=0.4,
        timeout=300,
    )
    result = parse_json(raw)
    print(f"  ✓ Reader [{reader['name']}] completed critique.", flush=True)
    return reader_key, result


def find_disagreements(results):
    disagreements = []
    for question in ["momentum_loss", "cut_candidate", "thinnest_character", "worst_scene"]:
        answers = {k: v.get(question, "") for k, v in results.items() if isinstance(v, dict)}
        chapters_mentioned = {}
        for reader, answer in answers.items():
            chs = set(re.findall(r'Ch(?:apter)?\s*(\d+)|الفصل\s*(\d+)', str(answer), re.IGNORECASE))
            flat_chs = set()
            for g1, g2 in chs:
                if g1: flat_chs.add(g1)
                if g2: flat_chs.add(g2)
            chapters_mentioned[reader] = flat_chs
        
        all_chs = set()
        for chs in chapters_mentioned.values():
            all_chs.update(chs)
        
        for ch in all_chs:
            flagged_by = [r for r, chs in chapters_mentioned.items() if ch in chs]
            not_flagged = [r for r, chs in chapters_mentioned.items() if ch not in chs]
            if flagged_by and not_flagged:
                disagreements.append({
                    "question": question,
                    "chapter": int(ch),
                    "flagged_by": flagged_by,
                    "not_flagged": not_flagged,
                    "details": {r: answers[r][:200] for r in flagged_by}
                })
    return disagreements


def main():
    arc_path = BASE_DIR / "arc_summary.md"
    if not arc_path.exists() or arc_path.stat().st_size < 50:
        chapter_files = sorted((BASE_DIR / "chapters").glob("ch_*.md"))
        if chapter_files:
            print("arc_summary.md not found, building from chapters...", flush=True)
            import build_arc_summary
            build_arc_summary.main()
        else:
            print("ERROR: No chapters and no arc_summary.md found.", file=sys.stderr, flush=True)
            return

    arc_summary = arc_path.read_text(encoding="utf-8")
    print(f"\nConvening 4-Reader Panel on {len(arc_summary.split())} words arc summary...", flush=True)

    results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(call_single_reader, r_key, arc_summary): r_key for r_key in READERS}
        for future in as_completed(futures):
            try:
                r_key, res = future.result()
                results[r_key] = res
            except Exception as e:
                r_key = futures[future]
                print(f"  ✗ Reader [{r_key}] failed: {e}", file=sys.stderr, flush=True)

    disagreements = find_disagreements(results)

    output = {
        "readers": results,
        "disagreements": disagreements,
        "timestamp": datetime.now().isoformat()
    }
    
    out_dir = BASE_DIR / "edit_logs"
    out_dir.mkdir(exist_ok=True, parents=True)
    out_path = out_dir / "reader_panel.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n==================================================", flush=True)
    print(f"✓ Reader Panel evaluation saved to {out_path}", flush=True)
    print(f"==================================================", flush=True)


if __name__ == "__main__":
    main()

