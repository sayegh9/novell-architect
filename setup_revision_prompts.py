import os
from pathlib import Path

BASE_DIR = Path(".")
PROMPTS_DIR = BASE_DIR / "prompts"
EN_DIR = PROMPTS_DIR / "en"
AR_DIR = PROMPTS_DIR / "ar"

# REVISION PROMPT
EN_DIR.joinpath("revision_prompt.txt").write_text("""Rewrite and revise Chapter {ch_num} based on this editorial revision brief.

REVISION BRIEF (follow this exactly):
{brief_content}

CURRENT DRAFT (previous version):
{old_text}

VOICE DEFINITION:
{voice}

CHARACTER REGISTRY:
{characters}

WORLD BIBLE:
{world}

PREVIOUS CHAPTER ENDING (maintain continuity):
{prev_tail}

Write the full revised chapter now. Do not truncate. Target 3000 words.
""")

AR_DIR.joinpath("revision_prompt.txt").write_text("""أنت بصدد إعادة كتابة وتنقيح الفصل رقم {ch_num} تنقيحاً أدبياً شاملاً وفق مذكرة المراجعة والتحرير.

مذكرة التحرير والتنقيح (REVISION BRIEF - التزم بها بدقة):
{brief_content}

المسودة الحالية للفصل (النسخة السابقة):
{old_text}

دليل العالم (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

محددات الصوت الأدبي (VOICE):
{voice}

نهاية الفصل السابق (لضمان ترابط التدفق السردي):
{prev_tail}

تعليمات إعادة الكتابة:
1. نفّذ التوجيهات المذكورة في مذكرة التحرير كاملة (حذف الحشو، ضبط الإيقاع، وتعميق الصراع الداخلي).
2. حافظ على الصوت الأدبي الفصيح، والسبك المتين، وتجنب الكليشيهات المترجمة.
3. اكتب الفصل المنقح كاملاً باللغة العربية الفصحى من البداية حتى النهاية. لا تقم بالتلخيص أو التقطيع.

اكتب الفصل {ch_num} المنقح كاملاً الآن:
""")

print("Revision prompts created.")
