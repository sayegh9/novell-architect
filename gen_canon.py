#!/usr/bin/env python3
"""
Generate canon.md by extracting all hard facts from world.md + characters.md.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer

SYSTEM_PROMPT = (
    "You are a continuity editor extracting hard facts from fantasy novel "
    "planning documents. You are precise, exhaustive, and never invent facts "
    "that aren't in the source material. Every entry must be traceable to a "
    "specific statement in the source documents."
)

def call_writer(prompt, max_tokens=16000):
    return _call_writer(prompt, system=SYSTEM_PROMPT, max_tokens=max_tokens, temperature=0.2, timeout=300)


def main():
    seed_file = BASE_DIR / "seed.txt"
    if not seed_file.exists():
        print("ERROR: seed.txt not found. Create or generate seed.txt first.", file=sys.stderr)
        sys.exit(1)

    seed = seed_file.read_text()
    world = (BASE_DIR / "world.md").read_text() if (BASE_DIR / "world.md").exists() else ""
    characters = (BASE_DIR / "characters.md").read_text() if (BASE_DIR / "characters.md").exists() else ""

    prompt = f"""Extract EVERY hard fact from these planning documents into a structured canon database.
A "hard fact" is anything a writer must not contradict: names, ages, dates, physical descriptions,
rules of the magic system, geography, relationships, established events.

SOURCE DOCUMENTS:

=== SEED.TXT ===
{seed}

=== WORLD.MD ===
{world}

=== CHARACTERS.MD ===
{characters}

FORMAT THE OUTPUT AS CANON.MD with these categories:

## Geography
- Specific facts about locations, distances, physical properties

## Timeline
- Dated events, ages, durations

## Magic System Rules
- Hard rules of Tonal Law (intervals, costs, limitations)
- Cass's gift specifics

## Character Facts
- Ages, physical descriptions, habits, relationships
- One entry per fact (not paragraphs)

## Political / Factional
- Who controls what, alliances, conflicts, contracts

## Cultural
- Customs, taboos, laws, festivals, food, clothing

## Established In-Story
- Events that have already happened in the story's past
- The Perin contract, the Expansion Wars, etc.

RULES:
- One fact per bullet point. Short. Specific. Checkable.
- Include the source (world.md or characters.md) in parentheses after each fact.
- Aim for 80-120 entries minimum. Be exhaustive.
- If two documents give slightly different details, note the discrepancy.
- DO NOT invent facts. Only record what's explicitly stated.
"""

    print("Calling writer model...", file=sys.stderr)
    result = call_writer(prompt)
    print(result)


if __name__ == "__main__":
    main()
