import os
import re
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()

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

def load_prompt(template_name: str) -> str:
    """Load a project override or the packaged template for its language."""
    lang = detect_project_language()
    prompt_path = BASE_DIR / "prompts" / lang / f"{template_name}.txt"
    if not prompt_path.exists():
        prompt_path = Path(__file__).resolve().parent / "prompts" / lang / f"{template_name}.txt"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt template {template_name}.txt not found for language '{lang}' at {prompt_path}")
        
    return prompt_path.read_text(encoding="utf-8")

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
