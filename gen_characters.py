#!/usr/bin/env python3
"""
One-shot characters.md generator for foundation phase.
Reads seed.txt + voice.md + world.md, calls writer model.
Supports Arabic and English dynamically.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import detect_project_language

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.7, timeout=300)

def main():
    seed_file = BASE_DIR / "seed.txt"
    if not seed_file.exists():
        print("ERROR: seed.txt not found. Create or generate seed.txt first.", file=sys.stderr)
        sys.exit(1)

    seed = seed_file.read_text(encoding="utf-8")
    world = (BASE_DIR / "world.md").read_text(encoding="utf-8") if (BASE_DIR / "world.md").exists() else ""
    voice = (BASE_DIR / "voice.md").read_text(encoding="utf-8") if (BASE_DIR / "voice.md").exists() else ""

    lang = detect_project_language()
    is_arabic = (lang == "ar")

    if is_arabic:
        system_prompt = (
            "أنت مصمم ومحلل شخصيات روائية من الطراز الرفيع، تمتلك فهماً عميقاً لأبعاد الشخصيات النفسية "
            "(الجرح الغائر، الرغبة الظاهرة، الحاجة الباطنة، والقناعة الزائفة)، وتمايز الأصوات الحوارية. "
            "تبتكر شخصيات تنبض بالحياة، مليئة بالتناقضات البشرية والأسرار والدوافع الحقيقية. "
            "تكتب بلغة عربية فصيحة، رصينة، بعيدة عن القوالب النمطية الجاهزة."
        )
        prompt = f"""ابنِ سجلاً شاملاً وعميقاً للشخصيات (CHARACTERS.MD) لهذه الرواية باللغة العربية الفصحى الرفيعة.
هذا المستند هو المرجع الحاكم لمن هم أبطال الرواية، وما يحركهم، وكيف يتحدثون، وما هي أسرارهم.

فكرة الرواية (البذرة):
{seed}

دليل العالم (WORLD BIBLE):
{world}

المطلوب لكل شخصية رئيسية وثانوية:
1. بطاقة الهوية: الاسم، العمر، الدور السردي، والمظهر الجسدي الحسي (بصمة بصرية مميزة).
2. المحرك النفسي: الجرح القديم (Wound)، الرغبة المعلنة (Want)، الحاجة الروحية (Need)، والقناعة الزائفة (Lie).
3. البصمة الصوتية والحوارية (Dialogue Voice): نبرة الصوت، الكلمات المتكررة، سرعة الكلام، وما الذي تخفيه وراء الكلمات.
4. العلاقات والتوترات: علاقة كل شخصية بالبطل وببقية الشخصيات، وما الذي يربطهم أو يفرقهم.

اكتب سجل الشخصيات كاملاً الآن باللغة العربية الفصحى المتينة:
"""
    else:
        system_prompt = (
            "You are a character designer for literary fiction with deep knowledge of "
            "wound/want/need/lie frameworks, Sanderson's three sliders, and dialogue "
            "distinctiveness. You create characters who feel like real people with "
            "contradictions, secrets, and speech patterns you can hear. "
            "You never use AI slop words. You write in clean, direct prose."
        )
        prompt = f"""Build a complete character registry for this fantasy novel. This is CHARACTERS.MD --
the definitive reference for WHO exists in this story, what drives them, how they speak,
and what secrets they carry.

SEED CONCEPT:
{seed}

WORLD BIBLE:
{world}

VOICE:
{voice}

Build the complete character registry now with clear psychological depth and unique dialogue voices.
"""

    print(f"Generating characters.md (Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    content = call_writer(prompt, system_prompt=system_prompt)
    
    content = content.strip()
    if content.startswith("```markdown"):
        content = content[11:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    (BASE_DIR / "characters.md").write_text(content, encoding="utf-8")
    print(f"characters.md written successfully ({len(content.split())} words)")

if __name__ == "__main__":
    main()
