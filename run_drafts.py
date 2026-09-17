#!/usr/bin/env python3
"""Batch draft chapters sequentially with evaluation and state updates."""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
CHAPTERS_DIR = BASE_DIR / "chapters"
CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)

def run(cmd, timeout=600):
    p = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=str(BASE_DIR),
    )
    output = []
    try:
        for line in p.stdout:
            print("  " + line, end="", flush=True)
            output.append(line)
        p.wait(timeout=timeout)
        return "".join(output), p.returncode
    except Exception as e:
        p.kill()
        return "".join(output) + f"\n[ERROR] {e}", -1


def main():
    parser = argparse.ArgumentParser(description="Batch draft chapters")
    parser.add_argument("--start", type=int, default=1, help="Starting chapter")
    parser.add_argument("--end", type=int, default=24, help="Ending chapter")
    parser.add_argument("--all", action="store_true", help="Draft all 24 chapters")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing drafted chapters")
    args = parser.parse_args()

    # Determine total from outline or default
    outline = BASE_DIR / "outline.md"
    total_chapters = 24
    if outline.exists():
        try:
            text = outline.read_text(encoding="utf-8")
            matches = re.findall(r'###\s*(?:Ch|Chapter|الفصل|فصل)\s*(\d+)', text, re.IGNORECASE)
            if matches:
                total_chapters = max(int(m) for m in matches)
        except Exception:
            pass

    start_ch = 1 if args.all else args.start
    end_ch = total_chapters if args.all else min(args.end, total_chapters)

    print(f"\n============================================================")
    print(f"  BATCH DRAFTING CHAPTERS {start_ch} TO {end_ch}")
    print(f"============================================================\n", flush=True)

    results = []
    import time

    for ch in range(start_ch, end_ch + 1):
        ch_file = CHAPTERS_DIR / f"ch_{ch:02d}.md"
        
        # Check if chapter already drafted
        if ch_file.exists() and ch_file.stat().st_size > 500 and not args.overwrite:
            try:
                words = len(ch_file.read_text(encoding="utf-8").split())
            except Exception:
                words = 0
            print(f"  [SKIPPED] Chapter {ch} already exists ({words} words). Use --overwrite to re-draft.", flush=True)
            results.append((ch, words, "ALREADY_DRAFTED"))
            continue

        print(f"\n--- Drafting Chapter {ch}/{end_ch} ---", flush=True)
        ch_start_time = time.time()
        
        # Run draft_chapter.py

        cmd = f'"{sys.executable}" draft_chapter.py {ch}'
        out, rc = run(cmd, timeout=600)
        
        if rc != 0 or not ch_file.exists() or ch_file.stat().st_size < 100:
            print(f"  [ERROR] Draft Ch {ch} failed: {out[-250:]}", flush=True)
            results.append((ch, 0, "FAILED"))
            print(f"  [PAUSE] Waiting 30s before next chapter to clear rate limits...", flush=True)
            time.sleep(30)
            continue

        try:
            words = len(ch_file.read_text(encoding="utf-8").split())
            word_count = words
        except Exception:
            word_count = len(ch_file.read_text().split()) if ch_file.exists() else 0
            words = word_count
        
        min_words = 1500 if os.environ.get("AUTONOVEL_LANGUAGE") == "ar" else 2000
        if word_count < min_words:
            print(f"  [X] Failed: Too short ({word_count} words < {min_words})")
            results.append((ch, word_count, "TOO_SHORT"))
            continue
            
        print(f"  [+] Success: {word_count} words. Running evaluation...", flush=True)
        eval_cmd = f'"{sys.executable}" evaluate.py --chapter={ch}'
        eval_out, _ = run(eval_cmd, timeout=300)
        m_score = re.search(r'overall_score:\s*([\d.]+)', eval_out)
        score = float(m_score.group(1)) if m_score else 6.0

        print(f"  [SCORE] Chapter {ch} score: {score}", flush=True)
        results.append((ch, words, f"score={score}"))

        # Update state.json
        state_file = BASE_DIR / "state.json"
        state = {}
        if state_file.exists():
            try:
                state = json.loads(state_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        
        actual_drafted = len(list(CHAPTERS_DIR.glob("ch_*.md")))
        state["chapters_drafted"] = actual_drafted
        state["current_focus"] = f"ch_{ch:02d}"
        state["phase"] = "drafting"
        state["chapters_total"] = total_chapters
        state_file.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

        # Ensure at least 25s per chapter cycle to maintain clean quota window with full 100% context
        cycle_elapsed = time.time() - ch_start_time
        if cycle_elapsed < 25.0:
            pause_time = 25.0 - cycle_elapsed
            time.sleep(pause_time)






    print(f"\n============================================================")
    print(f"  BATCH DRAFTING COMPLETE")
    print(f"============================================================")
    total_words = sum(r[1] for r in results)
    print(f"  Total words: {total_words}")
    print(f"  Chapters completed: {len([r for r in results if r[1] > 0])}/{len(results)}")
    for ch, words, status in results:
        print(f"    Ch {ch:2d}: {words:5d} words | {status}")

if __name__ == "__main__":
    main()

