import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent

def is_arabic_text(text: str) -> bool:
    """Check if the given text contains a significant amount of Arabic characters."""
    if not text:
        return False
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    return arabic_chars > 20

def detect_project_language() -> str:
    """Detect whether the current novel project is Arabic ('ar') or English ('en')."""
    # 1. Check environment variable
    env_lang = os.environ.get("AUTONOVEL_LANGUAGE", "").lower().strip()
    if env_lang in ("ar", "arabic"):
        return "ar"
    if env_lang in ("en", "english"):
        return "en"

    # 2. Check seed.txt
    seed_path = BASE_DIR / "seed.txt"
    if seed_path.exists():
        seed_content = seed_path.read_text(encoding="utf-8")
        if is_arabic_text(seed_content):
            return "ar"

    # 3. Check outline.md or world.md
    for filename in ("outline.md", "world.md", "characters.md"):
        doc_path = BASE_DIR / filename
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            if is_arabic_text(content):
                return "ar"

    return "en"

def get_arabic_writer_system_prompt() -> str:
    return (
        "أنت كاتب وروائي محترف في الأدب القصصي الرفيع، تكتب فصول روايات باللغة العربية الفصحى الأصيلة.\n"
        "تنبيه صارم: ابدأ كتابة نص الفصل مباشرة دون أي مقدمات تحاورية، أو مجاملات، أو تعليقات تمهيدية "
        "(ممنوع تماماً عبارات مثل: 'بالتأكيد، سأكتب...' أو 'إليك الفصل الأول...' أو 'حسناً'). ابدأ فوراً بعنوان الفصل أو الفقرة الأولى.\n\n"
        "القواعد الصارمة للكتابة:\n"
        "1. الكتابة بضمير الغائب المحدود (Third-person limited) في زمن الماضي، مقيداً بوجهة نظر بطل الفصل.\n"
        "2. لغة عربية فصيحة، سبك أدبي متين، مع تجنب الترجمة الحرفية للكليشيهات الإنجليزية.\n"
        "3. إظهار المشاعر عبر ردود الفعل الجسدية والحسية المباشرة (Body-First Sensory Details).\n"
        "4. الحوار باللغة العربية الفصحى الطبيعية الحية (Spoken Literary Fusha) التي تعكس الفوارق الطبقية والشخصية.\n"
        "5. الالتزام الصارم بجميع نبضات المخطط وأحداث الفصل دون حذف أو اختصار.\n"
        "6. كتابة النص السردي الكامل للفصل دون وضع ملخصات أو نقاط مجتزأة."
    )

def get_english_writer_system_prompt() -> str:
    return (
        "You are a literary fiction writer drafting a fantasy novel chapter. "
        "CRITICAL: Do NOT include any conversational preamble, pleasantries, or meta-commentary "
        "(e.g. 'Sure, here is...', 'Certainly, I will write...'). Start IMMEDIATELY with the chapter heading or first scene paragraph.\n\n"
        "You write in third-person limited past tense, locked to one POV character. "
        "You follow the voice definition exactly. You hit every beat in the outline. "
        "You never use words from the banned list. You show, never tell emotions. "
        "Your prose is specific, sensory, grounded. Metaphors come from the character's "
        "experience. You vary sentence length. You trust the reader. "
        "You write the FULL chapter -- do not truncate, summarize, or skip ahead."
    )

def clean_chapter_text(text: str, chapter_num: int = 1) -> str:
    """Strip out markdown code fences, conversational preambles, and meta-commentary."""
    text = text.strip()
    # Strip markdown code fences
    if text.startswith("```markdown"):
        text = text[11:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Regex patterns for conversational openings
    preamble_patterns = [
        r'^(?:بالتأكيد|حسناً|بالطبع|إليك|سأكتب|سأقوم|فيما يلي|ها هو).*?\n+',
        r'^(?:Sure|Certainly|Here is|Here\'s|Okay|Of course|I will write|Below is).*?\n+',
    ]
    for pattern in preamble_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE).strip()

    # Strip leading horizontal divider lines (e.g. *** or --- or ___)
    text = re.sub(r'^(?:\*\*\*|---|___|\s)+\n+', '', text).strip()

    # Clean leading markdown headers like ### **الفصل الأول** to # الفصل الأول
    text = re.sub(r'^#{2,6}\s*\*{0,2}(.*?)\*{0,2}\s*$', r'# \1', text, count=1, flags=re.MULTILINE)

    # Ensure starts with a single # title if not present
    if not text.startswith('#'):
        lines = text.split('\n')
        if lines and re.match(r'^(?:الفصل|فصل|Chapter|Ch)\b', lines[0].strip(), re.IGNORECASE):
            lines[0] = f"# {lines[0].strip()}"
            text = '\n'.join(lines)
        else:
            is_ar = is_arabic_text(text)
            header = f"# الفصل {chapter_num}" if is_ar else f"# Chapter {chapter_num}"
            text = f"{header}\n\n{text}"

    return text.strip()
