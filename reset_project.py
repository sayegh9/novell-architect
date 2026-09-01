#!/usr/bin/env python3
"""
reset_project.py -- Cleanly resets Autonovel Studio to start a new novel.

Usage:
  python3 reset_project.py             # Reset state and clear existing drafts/logs
  python3 reset_project.py --archive   # Archive current novel to archive/ before resetting
  python3 reset_project.py --keep-seed # Reset everything except seed.txt
"""

import os
import sys
import shutil
import json
import argparse
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()

def reset_project(archive: bool = True, keep_seed: bool = False):
    print("=" * 60)
    print("AUTONOVEL PROJECT RESET")
    print("=" * 60)

    # 1. Archive previous work if requested
    if archive:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_dir = BASE_DIR / "archive" / f"novel_{timestamp}"
        archive_dir.mkdir(parents=True, exist_ok=True)
        print(f"[*] Archiving current novel to: archive/novel_{timestamp}/")

        # Copy documents
        for doc in ["seed.txt", "world.md", "characters.md", "outline.md", "canon.md", "arc_summary.md", "reviews.md", "state.json", "results.tsv"]:
            src = BASE_DIR / doc
            if src.exists():
                shutil.copy2(src, archive_dir / doc)

        # Copy folders
        for folder in ["chapters", "eval_logs", "edit_logs", "briefs"]:
            src_dir = BASE_DIR / folder
            if src_dir.exists() and list(src_dir.glob("*")):
                shutil.copytree(src_dir, archive_dir / folder, dirs_exist_ok=True)

    # 2. Reset state.json
    default_state = {
        "phase": "foundation",
        "current_focus": "planning",
        "iteration": 0,
        "foundation_score": 0.0,
        "lore_score": 0.0,
        "chapters_drafted": 0,
        "chapters_total": 0,
        "novel_score": 0.0,
        "debts": [],
        "revision_cycle": 0
    }
    state_path = BASE_DIR / "state.json"
    state_path.write_text(json.dumps(default_state, indent=2))
    print("[✓] state.json reset to Foundation phase (0 chapters).")

    # 3. Clean chapters directory
    chapters_dir = BASE_DIR / "chapters"
    if chapters_dir.exists():
        for ch_file in chapters_dir.glob("ch_*.md"):
            ch_file.unlink()
    chapters_dir.mkdir(exist_ok=True)
    (chapters_dir / ".gitkeep").touch()
    print("[✓] chapters/ cleared.")

    # 4. Clean log directories
    for folder in ["eval_logs", "edit_logs", "briefs"]:
        d = BASE_DIR / folder
        if d.exists():
            for item in d.glob("*"):
                if item.is_file() and item.name != ".gitkeep":
                    item.unlink()
        d.mkdir(exist_ok=True)
        (d / ".gitkeep").touch()
    print("[✓] eval_logs/, edit_logs/, and briefs/ cleared.")

    # 5. Reset planning documents (unless keep_seed is true)
    if not keep_seed:
        seed_path = BASE_DIR / "seed.txt"
        starter_seed = """# Working Title: [Your Novel Title]

HOOK: [One sentence hook describing the protagonist, world, and core premise]

WORLD: [Name and sensory description of the setting]

MAGIC/COST: [The magic system rules, and the strict physical or emotional cost]

CENTRAL LIE: [The protagonist's false belief that prevents their growth]

CORE TENSION: [The central irreconcilable conflict driving the narrative]
"""
        seed_path.write_text(starter_seed)
        print("[✓] seed.txt reset with fresh template.")

    # Reset generated foundation docs
    for doc in ["world.md", "characters.md", "outline.md", "canon.md", "arc_summary.md", "reviews.md"]:
        p = BASE_DIR / doc
        if p.exists():
            p.unlink()
    print("[✓] Foundation planning files cleared for fresh generation.")

    # Clear results.tsv
    results_path = BASE_DIR / "results.tsv"
    if results_path.exists():
        results_path.write_text("commit\tphase\tscore\tword_count\tstatus\tdescription\n")
    print("[✓] results.tsv reset.")

    print("\n" + "=" * 60)
    print("Project successfully reset! You are ready to start a new novel.")
    print("Steps to begin:")
    print("  1. Edit seed.txt with your new story premise (or use Seed Studio UI).")
    print("  2. Run 'python3 run_pipeline.py --from-scratch' (or click Run Pipeline in UI).")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Reset Autonovel project for a new book")
    parser.add_argument("--no-archive", action="store_true", help="Do not archive current novel before resetting")
    parser.add_argument("--keep-seed", action="store_true", help="Keep current seed.txt premise")
    args = parser.parse_args()

    reset_project(archive=not args.no_archive, keep_seed=args.keep_seed)


if __name__ == "__main__":
    main()
