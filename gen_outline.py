#!/usr/bin/env python3
"""
Generate outline.md from seed + world + characters + mystery + craft.
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
    is_arabic = (lang == "ar")

    if is_arabic:
        system_prompt = (
            "أنت مهندس حبكات روائية ومعماري سردي بارع، تمتلك معرفة عميقة بهندسة الفصول "
            "وقوانين التصاعد الدرامي ونقاط التحول المحورية. تبني مخططات فصول محكمة، دقيقة، "
            "بحيث يتمكن الكاتب من صياغة كل فصل فوراً دون تردد. "
            "لكل فصل هدف سردي واضح، ونبضات محددة، وقوس عاطفي متصاعد، وخاتمة مشوقة. "
            "تكتب بلغة عربية فصحى أدبية رفيعة."
        )
        prompt = f"""ابنِ مخططاً تفصيلياً كاملاً لفصول الرواية (OUTLINE.MD) باللغة العربية الفصحى.
المستهدف: رواية من 20 إلى 24 فصلاً.

فكرة الرواية (البذرة):
{seed}

دليل العالم (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

اللغز والسر الجوهري:
{mystery}

متطلبات المخطط:
قسّم الرواية إلى 4 فصول رئيسية (الأعمال الدرامية):
- الفصل التمهيدي (الفصول 1-6): التعريف بالعالم، الصعود، وتوزيع الأدوار وبداية التوتر.
- الفصل التصاعدي الأول (الفصول 7-12): أول بوادر الاستقلال والشرخ، نقطة اللاعودة في المنتصف.
- الفصل التصاعدي الثاني (الفصول 13-18): تصاعد الصراع، خلع الأقنعة، والانهيار الممنهج.
- الفصل الختامي (الفصول 19-24): الذروة الدرامية الكبرى، المواجهة الحاسمة، وحسم المصائر.

لكل فصل من الفصول (من الفصل 1 إلى الفصل 24)، اكتب التالي بدقة متناهية:
### الفصل X: [عنوان الفصل]
- شخصية وجهة النظر (POV): [اسم الشخصية]
- موقع المشهد: [المكان بالتحديد]
- النبضات السردية (Numbered Beats):
  1. [النبضة الأولى: كيف يبدأ المشهد]
  2. [النبضة الثانية: تصاعد الحوار أو الحدث]
  3. [النبضة الثالثة: المفاجأة أو التوتر]
  4. [النبضة الرابعة: القرار أو النتيجة]
- القوس العاطفي والهدف: [التحول الشعوري للشخصية]
- الخاتمة والخطاف: [كيف ينتهي الفصل ويمهّد للتالي]

اكتب المخطط كاملاً الآن باللغة العربية الفصحى لجميع الفصول الـ 24:
"""
    else:
        system_prompt = (
            "You are a novel architect with deep knowledge of Save the Cat beats, "
            "Sanderson's plotting principles, Dan Harmon's Story Circle, and MICE Quotient. "
            "You build outlines that an author can draft from without inventing structure "
            "on the fly. Every chapter has beats, emotional arc, and try-fail cycle type. "
            "You never use AI slop words. You write in clean, direct prose."
        )
        prompt = f"""Build a complete chapter outline for this fantasy novel. Target: 20-24 chapters.

SEED CONCEPT:
{seed}

THE CENTRAL MYSTERY:
{mystery}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE:
{voice}

Build the complete chapter outline now. Each chapter must have specific beats, POV, setting, and emotional shift.
"""

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
