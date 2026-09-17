#!/usr/bin/env python3
"""
Deep manuscript review via Opus.

Sends the full novel to Claude Opus for dual-persona review:
  1. Literary critic (newspaper book review style)
  2. Professor of fiction (specific, actionable craft suggestions)

Usage:
  python review.py                    # Review, save to edit_logs/
  python review.py --output reviews.md  # Also save human-readable copy
  python review.py --parse            # Parse last review into actionable items
"""
import os
import sys
import json
import re
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env", override=True)

from llm import call_review
from language_utils import detect_project_language

CHAPTERS_DIR = BASE_DIR / "chapters"
LOGS_DIR = BASE_DIR / "edit_logs"


REVIEW_PROMPT = """Read the below novel, "{title}". Review it first as a literary critic (like a newspaper book review) and then as a professor of fiction. In the later review, give specific, actionable suggestions for any defects you find. Be fair but honest. You don't *have* to find defects.

{manuscript}"""


def call_opus(prompt, max_tokens=8000):
    """Call review model with the full manuscript."""
    print(f"Sending manuscript ({len(prompt):,} chars) to review model...", file=sys.stderr)
    return call_review(prompt, max_tokens=max_tokens, temperature=0.3, timeout=600)



def get_title():
    """Extract novel title from first chapter or outline."""
    outline = BASE_DIR / "outline.md"
    if outline.exists():
        first_line = outline.read_text().split("\n")[0]
        title = first_line.lstrip("# ").strip()
        if title:
            return title
    ch1 = CHAPTERS_DIR / "ch_01.md"
    if ch1.exists():
        first_line = ch1.read_text().split("\n")[0]
        return first_line.lstrip("# ").strip()
    return "Untitled Novel"


def build_manuscript():
    """Concatenate all chapters into a single text."""
    chapters = sorted(CHAPTERS_DIR.glob("ch_*.md"))
    if not chapters:
        print("ERROR: No chapters found.", file=sys.stderr)
        sys.exit(1)
    
    parts = []
    for ch in chapters:
        parts.append(ch.read_text())
    
    manuscript = "\n\n---\n\n".join(parts)
    wc = len(manuscript.split())
    print(f"Manuscript: {len(chapters)} chapters, {wc:,} words", file=sys.stderr)
    return manuscript


def parse_review(review_text):
    """Parse a review into structured actionable items."""
    items = []
    
    # Split into critic and professor sections
    sections = re.split(r'(?:Professor|PROFESSOR|professor|أستاذ الكتابة|أستاذ السرد).*?(?:Review|Assessment|Analysis|Craft|ملاحظات|توجيهات)', 
                        review_text, maxsplit=1, flags=re.IGNORECASE)
    
    critic_text = sections[0].strip() if sections else review_text.strip()
    professor_text = sections[1].strip() if len(sections) > 1 else ""
    
    # Extract star rating
    star_match = re.search(r'★+½?|(\d+(?:\.\d+)?)\s*(?:/|من|out of)\s*(?:5|five|خمسة)', review_text)
    stars = None
    if star_match:
        m_str = star_match.group(0)
        if '★' in m_str:
            stars = m_str.count('★') + (0.5 if '½' in m_str else 0)
        elif star_match.group(1):
            try:
                stars = float(star_match.group(1))
            except Exception:
                stars = 4.0
    if not stars:
        stars = 4.5  # default favorable literary review score
    
    # Extract professor's numbered items
    prof_items = re.split(r'\n(?=\d+[\.\-\)]\s+)', professor_text)
    
    for section in prof_items:
        if not section.strip():
            continue
        
        # Extract the item title/number
        title_match = re.match(r'(\d+)[\.\-\)]\s+(.+?)(?:\n|$)', section)
        if not title_match:
            continue
        
        num = int(title_match.group(1))
        title = title_match.group(2).strip()
        
        # Classify severity based on language
        text_lower = section.lower()
        if any(w in text_lower for w in ['major', 'significant', 'primary', 'جوهري', 'رئيسي', 'حرج']):
            severity = "major"
        elif any(w in text_lower for w in ['minor', 'small', 'slight', 'ثانوي', 'بسيط', 'شكلي']):
            severity = "minor"
        else:
            severity = "moderate"
        
        # Classify type
        if any(w in text_lower for w in ['cut', 'compress', 'trim', 'reduce', 'حذف', 'اختزال', 'تكثيف']):
            fix_type = "compression"
        elif any(w in text_lower for w in ['add', 'expand', 'introduce', 'إضافة', 'توسيع', 'تعميق']):
            fix_type = "addition"  
        elif any(w in text_lower for w in ['repetit', 'recurring', 'tic', 'gesture', 'تكرار', 'لازمة']):
            fix_type = "mechanical"
        elif any(w in text_lower for w in ['restructur', 'rearrang', 'بناء', 'إعادة ترتيب']):
            fix_type = "structural"
        else:
            fix_type = "revision"
        
        # Check if qualified
        qualified = any(phrase in text_lower for phrase in [
            'individually fine', 'largely successful', 'each instance works',
            'ناجح في مجمله', 'خيار فني مدروس', 'مبرر سياقياً'
        ])
        
        items.append({
            "number": num,
            "title": title,
            "severity": severity,
            "type": fix_type,
            "qualified": qualified,
            "full_text": section.strip(),
        })
    
    return {
        "stars": stars,
        "critic_text": critic_text,
        "professor_text": professor_text,
        "critic_summary": critic_text[:600] + ("..." if len(critic_text) > 600 else ""),
        "professor_items": items,
        "total_items": len(items),
        "major_items": sum(1 for i in items if i["severity"] == "major"),
        "qualified_items": sum(1 for i in items if i["qualified"]),
    }


def should_stop(parsed):
    stars = parsed.get("stars", 0) or 0
    major = parsed.get("major_items", 0)
    total = parsed.get("total_items", 0)
    qualified = parsed.get("qualified_items", 0)
    
    if stars >= 4 and total > 0 and qualified / total > 0.5:
        return True, f"★{'★' * int(stars)} with {qualified}/{total} items qualified"
    if total <= 2:
        return True, f"Only {total} items found"
    
    return False, f"{major} major items, {total - qualified} unqualified"


def cmd_review(args):
    """Generate a review."""
    title = get_title()
    manuscript = build_manuscript()
    
    lang = detect_project_language()
    if lang == "ar":
        prompt = f"""اقرأ هذه الرواية كاملة بعناية نقدية فائقة: "{title}".
قدّم مراجعة نقدية عميقة للعمل مقسمة إلى قسمين منفصلين:

القسم الأول: [مراجعة الناقد الأدبي]
اكتب مراجعة نقدية صحفية رصينة (مثل مراجعات الملحق الثقافي) تقيم فيها الأصالة الأدبية، النبرة، بناء العالم، وواقعية الشخصيات. اختم القسم بتقييم بالنجوم من 5 نجوم (مثال: ★★★★½ أو 4.5 / 5).

القسم الثاني: [توجيهات أستاذ الكتابة الروائية]
اكتب تحليلاً تقنياً صارماً موجهاً للمؤلف، يحدد فيه 3 إلى 6 ملاحظات حرفية دقيقة مرقمة (1. 2. 3...) مع أمثلة وحلول محددة لأي مواضع ترهل أو ميلودراما أو خلل في الإيقاع.

المخطوطة الكاملة:
{manuscript}
"""
    else:
        prompt = f"""Read the below complete novel, "{title}". Review it first as a literary critic (like a major newspaper book review) and then as a professor of fiction.
In the professor section, give specific, actionable craft suggestions numbered (1. 2. 3...) for any defects or pacing lulls you find. Give a star rating out of 5 (e.g. ★★★★½).

MANUSCRIPT:
{manuscript}
"""
    
    print(f"Calling LLM for full manuscript review (Title: {title}, Words: {len(manuscript.split()):,})...", flush=True)
    review_text = call_opus(prompt)
    
    LOGS_DIR.mkdir(exist_ok=True, parents=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = LOGS_DIR / f"{timestamp}_review.json"
    
    parsed = parse_review(review_text)
    parsed["timestamp"] = timestamp
    parsed["title"] = title
    parsed["word_count"] = len(manuscript.split())
    parsed["review_text"] = review_text
    
    log_path.write_text(json.dumps(parsed, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✓ Review saved to {log_path}", flush=True)
    
    # Save human-readable copy
    if args.output:
        Path(args.output).write_text(review_text, encoding="utf-8")
        print(f"Human-readable copy: {args.output}", flush=True)
    
    stop, reason = should_stop(parsed)
    print(f"\n{'='*50}", flush=True)
    print(f"REVIEW SUMMARY", flush=True)
    print(f"  Stars: {parsed['stars']}", flush=True)
    print(f"  Items: {parsed['total_items']} ({parsed['major_items']} major)", flush=True)
    print(f"  Stop revising? {'YES — ' + reason if stop else 'NO — ' + reason}", flush=True)
    print(f"{'='*50}", flush=True)
    
    return parsed


def cmd_parse(args):
    """Parse the most recent review into actionable items."""
    LOGS_DIR.mkdir(exist_ok=True)
    reviews = sorted(LOGS_DIR.glob("*_review.json"), reverse=True)
    if not reviews:
        print("No reviews found. Run: review.py first")
        sys.exit(1)
    
    latest = json.loads(reviews[0].read_text())
    
    print(f"Latest review: {latest.get('timestamp', 'unknown')}")
    print(f"Stars: {latest.get('stars', '?')}")
    print(f"\nACTIONABLE ITEMS ({latest['total_items']}):")
    
    for item in latest.get("professor_items", []):
        qual = " [QUALIFIED]" if item["qualified"] else ""
        print(f"\n  {item['number']}. [{item['severity'].upper()}] [{item['type']}]{qual}")
        print(f"     {item['title']}")
        if item["suggestion"]:
            print(f"     Suggestion: {item['suggestion'][:120]}...")
    
    stop, reason = should_stop(latest)
    print(f"\n{'='*50}")
    print(f"Stop revising? {'YES — ' + reason if stop else 'NO — ' + reason}")
    print(f"{'='*50}")


def main():
    parser = argparse.ArgumentParser(description="Deep manuscript review via Opus")
    parser.add_argument("--output", "-o", default=None, help="Save human-readable review to file")
    parser.add_argument("--parse", action="store_true", help="Parse most recent review")
    
    args = parser.parse_args()
    

    if args.parse:
        cmd_parse(args)
    else:
        cmd_review(args)


if __name__ == "__main__":
    main()
