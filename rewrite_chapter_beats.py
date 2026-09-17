#!/usr/bin/env python3
"""
rewrite_chapter_beats.py -- Rewrite a chapter draft after beats have been edited.

Supports two operational modes:
  1. --mode=fresh  : Clean-slate re-draft directly from the new beats. Old prose is backed up and NOT fed to the LLM to prevent narrative contamination.
  2. --mode=revise : Guided rewrite that provides the existing prose draft alongside the updated beats, preserving evocative prose while overhauling conflicting scenes.

Usage:
  python rewrite_chapter_beats.py <chapter_num> [--mode=fresh|revise]
"""
import os
import sys
import re
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env", override=True)

from llm import call_writer as _call_writer
from language_utils import (
    detect_project_language,
    get_arabic_writer_system_prompt,
    get_english_writer_system_prompt,
    clean_chapter_text
)
from draft_chapter import extract_chapter_outline, extract_next_chapter_outline

CHAPTERS_DIR = BASE_DIR / "chapters"
BACKUPS_DIR = BASE_DIR / "chapters_backup"
CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.75, timeout=600)

def load_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""

def backup_existing_chapter(chapter_num: int) -> Path | None:
    ch_path = CHAPTERS_DIR / f"ch_{chapter_num:02d}.md"
    if not ch_path.exists():
        return None
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUPS_DIR / f"ch_{chapter_num:02d}_{timestamp}.md"
    content = ch_path.read_text(encoding="utf-8")
    backup_path.write_text(content, encoding="utf-8")
    return backup_path

def main():
    parser = argparse.ArgumentParser(description="Rewrite chapter draft following beats edits.")
    parser.add_argument("chapter", type=int, help="Chapter number (1-24)")
    parser.add_argument("--mode", choices=["fresh", "revise"], default="fresh",
                        help="Rewrite mode: 'fresh' (clean slate from beats) or 'revise' (blend existing prose with new beats)")
    args = parser.parse_args()

    chapter_num = args.chapter
    mode = args.mode

    if not (1 <= chapter_num <= 24):
        print(f"Error: Chapter number must be between 1 and 24, got {chapter_num}", file=sys.stderr)
        sys.exit(1)

    print(f"=== Starting Chapter {chapter_num} Rewrite [Mode: {mode.upper()}] ===", flush=True)

    # 1. Safely backup existing chapter draft
    backup_path = backup_existing_chapter(chapter_num)
    if backup_path:
        print(f"[✓] Backed up current draft to: {backup_path.relative_to(BASE_DIR)}", flush=True)
    else:
        print(f"[*] No existing draft found for Chapter {chapter_num}; generating new draft.", flush=True)

    # 2. Load context documents
    voice = load_file(BASE_DIR / "voice.md")
    world = load_file(BASE_DIR / "world.md")
    characters = load_file(BASE_DIR / "characters.md")
    outline = load_file(BASE_DIR / "outline.md")
    canon = load_file(BASE_DIR / "canon.md")
    seed = load_file(BASE_DIR / "seed.txt")

    lang = detect_project_language()
    is_arabic = (lang == "ar")

    # 3. Chapter-specific outline extraction
    chapter_outline = extract_chapter_outline(outline, chapter_num)
    next_chapter = extract_next_chapter_outline(outline, chapter_num)

    # Previous chapter tail for opening continuity
    prev_path = CHAPTERS_DIR / f"ch_{chapter_num - 1:02d}.md"
    prev_tail = ""
    if prev_path.exists():
        try:
            prev_text = prev_path.read_text(encoding="utf-8")
            prev_tail = prev_text[-2000:] if len(prev_text) > 2000 else prev_text
        except Exception:
            pass

    # 4. Existing draft for revise mode
    existing_draft_path = CHAPTERS_DIR / f"ch_{chapter_num:02d}.md"
    existing_draft = load_file(existing_draft_path)

    # 5. Build prompt according to mode and language
    if is_arabic:
        if mode == "fresh" or not existing_draft:
            system_prompt = get_arabic_writer_system_prompt()
            prompt = f"""أنت روائي وأديب محترف، تقوم بصياغة وكتابة مسودة جديدة بالكامل للفصل رقم {chapter_num} بناءً على نبضات المخطط المحدثة.

فكرة الرواية الأساسية (البذرة):
{seed}

نبضات ومخطط هذا الفصل المحدثة (الفصل {chapter_num}):
{chapter_outline}

مخطط الفصل القادم (لضمان التمهيد وانسياب القفلة):
{next_chapter}

خاتمة الفصل السابق (تابع السرد مباشرة من حيث انتهى المشهد):
{prev_tail if prev_tail else "(هذا هو الفصل الافتتاحي للرواية)"}

عالم الرواية وبيئتها (WORLD BIBLE):
{world}

سجل الشخصيات وأسلوب حوارهم (CHARACTERS):
{characters}

حقائق الكانون والأسرار (CANON):
{canon}

دليل الأسلوب والصوت السردي ومحاذير الكتابة (VOICE):
{voice}

تعليمات الكتابة الصارمة:
1. اكتب الفصل كاملاً بسرد أدبي متدفق ومكثف (استهدف ما بين 2,500 إلى 3,500 كلمة دون أي اختصار).
2. التزم بضمير الغائب المحدود (Third-Person Limited) مقيداً بوجهة نظر بطل الفصل.
3. طبق جميع النبضات السردية المذكورة في المخطط بالترتيب الدقيق.
4. جسد التفاصيل الحسية والجسدية للشخصيات، واجعل الحوار فصيحاً حياً يعكس النبرة النفسية لكل شخصية وفق ملفها.
5. التزم بجميع محاذير دليل الأسلوب (لا كليشيهات مترجمة، لا تفسيرات ذهنية مباشرة للمشاعر).
6. اكتب نسيجاً روائياً مستمراً دون عناوين فرعية أو نقاط موجزة.

اكتب مسودة الفصل {chapter_num} كاملة الآن:
"""
        else:
            # Revise mode in Arabic
            system_prompt = (
                "أنت روائي عربي قدير ومحرر أدبي رفيع المستوى.\n"
                "مهمتك: إعادة صياغة وتنقيح المسودة الحالية للفصل لتتوافق تماماً مع النبضات السردية المعدلة.\n"
                "القواعد الصارمة:\n"
                "1. ابدأ كتابة النص الروائي مباشرة دون أي مقدمات أو تعليقات خارجية.\n"
                "2. حافظ على الفقرات الوصفية البديعة والحوارات المتقنة في المسودة الحالية التي لا تتعارض مع النبضات الجديدة.\n"
                "3. أعد كتابة أو استبدل المشاهد التي تعارض النبضات المحدثة بالكامل وبدقة.\n"
                "4. الالتزام بضمير الغائب المحدود واللغة العربية الفصحى الأصيلة دون كليشيهات مترجمة."
            )
            prompt = f"""أنت بصدد إعادة كتابة وتنقيح الفصل رقم {chapter_num} لإدماج نبضات المخطط المحدثة مع الحفاظ على قوة السرد في المسودة الحالية.

نبضات ومخطط الفصل المحدثة (المرجع الملزم):
{chapter_outline}

المسودة الحالية للفصل (النسخة السابقة - استفد من لغتها وصورها الصالحة):
{existing_draft}

خاتمة الفصل السابق (لضمان ترابط التدفق السردي):
{prev_tail if prev_tail else "(هذا هو الفصل الافتتاحي للرواية)"}

مخطط الفصل القادم (لضمان التمهيد الذكي):
{next_chapter}

عالم الرواية (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

دليل الأسلوب ومحددات الصوت (VOICE):
{voice}

توجيهات التنقيح وإعادة الصياغة:
1. نفّذ كل نبضة من نبضات المخطط المحدثة بتجسيد روائي حي كامل.
2. احتفظ بالمشاهد والعبارات البلاغية والوصف الحسي من المسودة الحالية في المواضع المتوافقة مع النبضات الجديدة.
3. عدّل أو احذف أو استبدل أي حدث كان في المسودة السابقة ولم يعد يتفق مع النبضات المحدثة.
4. حافظ على الاتساق مع نهاية الفصل السابق وبداية الفصل اللاحق.
5. اكتب النص الكامل المنقح للفصل {chapter_num} دون أي تلخيص أو حواشٍ.

اكتب نص الفصل {chapter_num} المنقح كاملاً الآن:
"""
    else:
        # English novel pipeline
        if mode == "fresh" or not existing_draft:
            system_prompt = get_english_writer_system_prompt()
            prompt = f"""Draft Chapter {chapter_num} of this literary fantasy novel following the updated outline beats.

SEED CONCEPT:
{seed}

UPDATED CHAPTER {chapter_num} OUTLINE & BEATS:
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
1. Write the COMPLETE chapter. Target ~2,500-3,500 words. Do not truncate or summarize.
2. Third-person limited, past tense, locked to the chapter's POV character.
3. Hit ALL numbered beats from the outline in order.
4. Show sensory detail: sounds, textures, physical sensations.
5. Dialogue follows the speech patterns defined in characters.md.
6. No banned AI slop words. Vary sentence lengths. Trust the reader.

Write the chapter now. Full text, beginning to end.
"""
        else:
            system_prompt = (
                "You are an expert literary novelist and senior fiction editor. "
                "Your task is to revise and rewrite the existing chapter draft so it strictly incorporates the updated outline beats. "
                "Retain rich sensory prose and strong character dialogue from the existing draft where compatible, "
                "but completely overhaul, excise, or add scenes as demanded by the new beats. "
                "Start IMMEDIATELY with the chapter heading and prose; no conversational preambles."
            )
            prompt = f"""Revise and rewrite Chapter {chapter_num} to integrate the updated outline beats.

UPDATED CHAPTER {chapter_num} OUTLINE & BEATS (authoritative guide):
{chapter_outline}

EXISTING DRAFT (carry over strong prose and compatible scenes):
{existing_draft}

PREVIOUS CHAPTER'S ENDING (ensure continuity):
{prev_tail if prev_tail else "(This is Chapter 1)"}

NEXT CHAPTER'S OUTLINE:
{next_chapter}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE GUARDRAILS:
{voice}

REVISION INSTRUCTIONS:
1. Harmonize the chapter with all updated outline beats in sequence.
2. Preserve existing evocative prose, dialogue, and atmospheric details that remain true to the new beats.
3. Rewrite or replace scenes that contradict the new beats.
4. Output the complete, polished chapter prose from start to finish.

Write the complete revised Chapter {chapter_num} now:
"""

    print(f"Calling LLM for Chapter {chapter_num} rewrite (Mode: {mode}, Language: {'Arabic' if is_arabic else 'English'})...", flush=True)
    rewritten_text = call_writer(prompt, system_prompt=system_prompt)

    # Clean text
    rewritten_text = clean_chapter_text(rewritten_text, chapter_num=chapter_num)

    # Save to chapter file
    out_path = CHAPTERS_DIR / f"ch_{chapter_num:02d}.md"
    out_path.write_text(rewritten_text, encoding="utf-8")

    word_count = len(rewritten_text.split())
    print(f"[✓] Chapter {chapter_num} successfully rewritten ({word_count:,} words) -> {out_path.relative_to(BASE_DIR)}", flush=True)

if __name__ == "__main__":
    main()
