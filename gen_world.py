#!/usr/bin/env python3
"""
One-shot world.md generator for foundation phase.
Reads seed.txt + voice.md, calls the writer model, outputs world.md content in Arabic or English.
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
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.7, timeout=300)

def main():
    seed_file = BASE_DIR / "seed.txt"
    if not seed_file.exists():
        print("ERROR: seed.txt not found. Create or generate seed.txt first.", file=sys.stderr)
        sys.exit(1)

    seed = seed_file.read_text(encoding="utf-8")
    voice = (BASE_DIR / "voice.md").read_text(encoding="utf-8") if (BASE_DIR / "voice.md").exists() else ""
    
    lang = detect_project_language()
    is_arabic = (lang == "ar")

    if is_arabic:
        system_prompt = (
            "أنت مهندس ومصمم عوالم روائية محترف، تمتلك معرفة عميقة بقوانين بناء العوالم الفانتازية والاجتماعية "
            "والتصميم الدرامي عالي الجودة. تصمم أدلة عوالم غنية، مترابطة، وتوحي بعمق تاريخي وثقافي يفوق ما هو مكتوب. "
            "تكتب بلغة عربية فصحى أدبية رفيعة، خالية تماماً من الكليشيهات الآلية والترجمات الحرفية. "
            "لكل قاعدة ثمن وتكلفة، ولكل تفصيل ثقافي تاريخ، ولكل مكان بصمة حسية وبصرية واضحة."
        )
        prompt = f"""ابنِ دليلاً شاملاً للعالم الروائي (WORLD.MD) لهذه الرواية باللغة العربية الفصحى الرفيعة.
هذا المستند هو المرجع الحاكم والنهائي لكل ما هو موجود في هذا العالم.

فكرة الرواية (البذرة):
{seed}

المطلوب بناؤه وتفصيله في دليل العالم:
1. الجغرافيا والمكان: الحاضرة أو المدينة الرئيسية، خريطة الأحياء والمواقع المحورية، الملمس الحسي لكل مكان (الروائح، الأصوات، العمارة).
2. النظام الاجتماعي وسلطة النفوذ: الأعراف الحاكمة، موازين القوى، الطبقات الاجتماعية، سيكولوجية العلاقات وقوانين الولاء.
3. التكلفة الإنسانية والصراعات المجتمعية: ثمن القوة، التوترات بين الأجيال أو الفئات، ونقاط الانفجار المحتملة.
4. التاريخ والأساطير المؤسسة: أحداث ماضية شكلت واقع الحاضر، أسرار لا يعرفها العامة.

اكتب دليل العالم كاملاً الآن باللغة العربية الفصحى المتينة:
"""
    else:
        system_prompt = (
            "You are a fantasy worldbuilder with deep knowledge of Sanderson's Laws, "
            "Le Guin's prose philosophy, and TTRPG-quality lore design. "
            "You write world bibles that are specific, interconnected, and imply depth "
            "beyond what's stated. You never use AI slop words. You write in clean, direct prose."
        )
        prompt = f"""Build a complete world bible for this fantasy novel. This is the WORLD.MD file -- 
the definitive reference for everything that EXISTS in this world. A writer should be able 
to resolve any worldbuilding question from this document alone.

SEED CONCEPT:
{seed}

VOICE & TONE:
{voice}

Build the complete world bible now. Clean markdown, rich sensory details, hard rules with tangible costs.
"""

    print(f"Generating world.md (Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    content = call_writer(prompt, system_prompt=system_prompt)
    
    content = content.strip()
    if content.startswith("```markdown"):
        content = content[11:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    (BASE_DIR / "world.md").write_text(content, encoding="utf-8")
    print(f"world.md written successfully ({len(content.split())} words)")

if __name__ == "__main__":
    main()
