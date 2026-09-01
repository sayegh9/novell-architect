#!/usr/bin/env python3
"""
Draft a single chapter using the writer model.
Supports both Arabic and English novel pipelines automatically.
Usage: python draft_chapter.py 1
"""
import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import detect_project_language, get_arabic_writer_system_prompt, get_english_writer_system_prompt, clean_chapter_text

CHAPTERS_DIR = BASE_DIR / "chapters"
CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.8, timeout=600)

def load_file(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""

def extract_chapter_outline(outline_text, chapter_num):
    """Extract a specific chapter's outline entry (supporting English and Arabic markers)."""
    # Try English match: ### Ch 1: or ### Chapter 1:
    pattern_en = rf'### (?:Ch|Chapter) {chapter_num}[:\s].*?(?=### (?:Ch|Chapter) {chapter_num + 1}[:\s]|## Foreshadowing|## الملاحظات|$)'
    match = re.search(pattern_en, outline_text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0).strip()
    
    # Try Arabic match: ### الفصل 1: or ### الفصل الأول:
    arabic_numbers = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
                      "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
                      "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون"]
    
    ar_num_str = arabic_numbers[chapter_num - 1] if 1 <= chapter_num <= len(arabic_numbers) else str(chapter_num)
    next_ar_str = arabic_numbers[chapter_num] if 1 <= chapter_num + 1 <= len(arabic_numbers) else str(chapter_num + 1)
    
    pattern_ar = rf'### (?:الفصل|فصل)\s+(?:{chapter_num}|{ar_num_str})[:\s].*?(?=### (?:الفصل|فصل)\s+(?:{chapter_num + 1}|{next_ar_str})[:\s]|## |$)'
    match = re.search(pattern_ar, outline_text, re.DOTALL)
    if match:
        return match.group(0).strip()
        
    return f"Chapter {chapter_num} beats from outline"

def extract_next_chapter_outline(outline_text, chapter_num):
    """Extract the next chapter's outline (just first few lines for continuity)."""
    next_entry = extract_chapter_outline(outline_text, chapter_num + 1)
    if not next_entry or "beats from outline" in next_entry:
        return "(final chapter / خاتمة الرواية)"
    lines = next_entry.split('\n')[:8]
    return '\n'.join(lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: python draft_chapter.py <chapter_number>", file=sys.stderr)
        sys.exit(1)

    chapter_num = int(sys.argv[1])
    
    # Load all context
    voice = load_file(BASE_DIR / "voice.md")
    world = load_file(BASE_DIR / "world.md")
    characters = load_file(BASE_DIR / "characters.md")
    outline = load_file(BASE_DIR / "outline.md")
    canon = load_file(BASE_DIR / "canon.md")
    seed = load_file(BASE_DIR / "seed.txt")
    
    # Detect language
    lang = detect_project_language()
    is_arabic = (lang == "ar")
    
    # Chapter-specific context
    chapter_outline = extract_chapter_outline(outline, chapter_num)
    next_chapter = extract_next_chapter_outline(outline, chapter_num)
    
    # Previous chapter (if exists)
    prev_path = CHAPTERS_DIR / f"ch_{chapter_num - 1:02d}.md"
    prev_tail = ""
    if prev_path.exists():
        prev_text = prev_path.read_text(encoding="utf-8")
        prev_tail = prev_text[-2000:] if len(prev_text) > 2000 else prev_text
    
    if is_arabic:
        system_prompt = get_arabic_writer_system_prompt()
        prompt = f"""أنت الآن بصدد كتابة الفصل رقم {chapter_num} كاملاً باللغة العربية الفصحى الأدبية الرفيعة.

فكرة الرواية (البذرة):
{seed}

مخطط ونبضات هذا الفصل (الفصل {chapter_num}):
{chapter_outline}

مخطط الفصل القادم (لضمان انسياب الخاتمة والتمهيد له):
{next_chapter}

خاتمة الفصل السابق (تابع السرد من حيث توقف):
{prev_tail if prev_tail else "(هذا هو الفصل الأول من الرواية)"}

دليل العالم (WORLD BIBLE):
{world}

سجل الشخصيات وأسلوب حوارهم (CHARACTERS):
{characters}

محددات الصوت الأدبي (VOICE):
{voice}

تعليمات الكتابة الصارمة:
1. اكتب الفصل كاملاً من البداية إلى النهاية باللغة العربية الفصحى الرفيعة. استهدف ما بين 2,500 إلى 3,500 كلمة.
2. استخدم ضمير الغائب المحدود (Third-Person Limited) مقيداً بوجهة نظر بطل الفصل.
3. التزم بجميع النبضات السردية المذكورة في مخطط الفصل بالترتيب.
4. أظهر التفاصيل الحسية والجسدية (ما تشعر به الشخصية، الروائح، ملمس الأشياء، ضغط الهواء والأصوات).
5. تجنب تماماً التراكيب المترجمة عن الإنجليزية أو الكليشيهات الآلية (مثل: "أخذ نفساً عميقاً"، "في خضم"، "لم يملك إلا أن").
6. اجعل الحوار فصيحاً وطبيعياً حياً يظهر التوتر والطبقات النفسية للشخصيات.
7. لا تضع نقاطاً أو ملخصات، بل اكتب نسيجاً روائياً سردياً كاملاً ومتدفقاً.

اكتب الفصل {chapter_num} كاملاً الآن باللغة العربية:
"""
    else:
        system_prompt = get_english_writer_system_prompt()
        prompt = f"""Draft Chapter {chapter_num} of this literary fantasy novel.

SEED CONCEPT:
{seed}

CHAPTER {chapter_num} OUTLINE & BEATS:
{chapter_outline}

NEXT CHAPTER'S OUTLINE (for continuity):
{next_chapter}

PREVIOUS CHAPTER'S ENDING (continue from here):
{prev_tail if prev_tail else "(This is Chapter 1)"}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE GUARDRAILS:
{voice}

WRITING INSTRUCTIONS:
1. Write the COMPLETE chapter. Target ~3,000-3,500 words. Do not truncate or summarize.
2. Third-person limited, past tense, locked to the chapter's POV character.
3. Hit ALL numbered beats from the outline in order.
4. Show sensory detail: sounds, textures, physical sensations.
5. Dialogue follows the speech patterns defined in characters.md.
6. No banned AI slop words. Vary sentence lengths. Trust the reader.

Write the chapter now. Full text, beginning to end.
"""

    print(f"Calling writer model for Chapter {chapter_num} (Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    chapter_text = call_writer(prompt, system_prompt=system_prompt)
    
    # Clean up formatting wrappers and conversational preambles
    chapter_text = clean_chapter_text(chapter_text, chapter_num=chapter_num)
    
    out_path = CHAPTERS_DIR / f"ch_{chapter_num:02d}.md"
    out_path.write_text(chapter_text, encoding="utf-8")

    
    words = len(chapter_text.split())
    print(f"Chapter {chapter_num} written successfully: {words} words -> {out_path}")

if __name__ == "__main__":
    main()
