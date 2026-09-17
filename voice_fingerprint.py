#!/usr/bin/env python3
"""
Voice fingerprint: quantitative analysis of prose across chapters or sample text.
Measures rhythm, sentence length variance, dialogue ratio, and vocabulary wells.
Outputs: edit_logs/voice_fingerprint.json with per-chapter and global metrics.
"""
import os
import sys
import re
import json
import statistics
import argparse
from pathlib import Path
from collections import Counter
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

CHAPTERS_DIR = BASE_DIR / "chapters"
EDIT_LOGS_DIR = BASE_DIR / "edit_logs"
EDIT_LOGS_DIR.mkdir(exist_ok=True, parents=True)

from language_utils import is_arabic_text

# English Vocabulary Wells
WELL_MUSICAL_EN = {
    "pitch", "tone", "interval", "chord", "note", "key", "octave", "fifth",
    "third", "fourth", "second", "seventh", "flat", "sharp", "harmonic",
    "resonance", "frequency", "vibration", "hum", "ring", "struck", "bell",
    "bells", "clapper", "tuning", "tuned", "tune", "scale", "melody",
    "rhythm", "beat", "measure", "rest", "composition", "composed", "sang",
    "sung", "sing", "singing", "voice", "voices", "choir", "acoustic",
    "acoustics", "sound", "sounds", "silence", "silent", "dissonance",
    "consonance", "resolution", "resolve", "resolving", "progression",
    "cadence", "tempo", "refrain", "notation", "codex", "fugue", "phrase",
}

WELL_TRADE_EN = {
    "bronze", "metal", "iron", "copper", "alloy", "forge", "lathe",
    "clapper", "gauge", "caliper", "oil", "linseed", "flux", "casting",
    "mold", "anvil", "hammer", "file", "workshop", "bench", "tools",
    "tool", "craft", "frame", "frames", "wax", "polish", "grain",
    "wood", "stone", "limestone", "coin", "coins", "contract", "contracts",
    "clause", "binding", "ratification", "petition", "ledger", "registry",
    "license", "licensed", "broker", "brokers", "merchant", "trade",
}

WELL_BODY_EN = {
    "eye", "eyes", "hand", "hands", "chest", "ribs", "jaw", "teeth",
    "tongue", "mouth", "throat", "shoulder", "shoulders", "back", "spine",
    "bone", "bones", "skin", "palm", "finger", "fingers", "thigh",
    "knee", "feet", "foot", "breath", "breathing", "pulse", "heart",
    "stomach", "gut", "temple", "temples", "skull", "wrist", "arm",
    "neck", "needle", "pain", "ache", "pressure", "tremor", "shaking",
    "shake", "shook", "steady", "still", "flinch", "tense", "tight",
    "cold", "warm", "heat", "sweat",
}

# Arabic Vocabulary Wells (سياقات حسية وجسدية ومكانية)
WELL_BODY_AR = {
    "عين", "عينين", "يد", "يدين", "أصابع", "صدر", "أضراس", "لسان", "فم", "حلق",
    "كتف", "كتفين", "عنق", "جبين", "عظام", "جلد", "نبض", "نفس", "أنفاس",
    "قلب", "جسد", "رأس", "نخاع", "ارتجاف", "رجفة", "برودة", "حرارة", "عرق",
    "ألم", "وجع", "صوت", "همس", "صمت", "صراخ", "نظرة", "ابتسامة"
}

WELL_SENSORY_AR = {
    "برونز", "حديد", "نحاس", "ذهب", "فضة", "زجاج", "رخام", "حجر", "خشب", "عود",
    "حبر", "ورق", "غبار", "شمس", "ظل", "ضوء", "ليل", "بحر", "ريح", "ملح",
    "قهوة", "مبخرة", "بساط", "حرير", "طين", "ماء", "رائحة", "عطر"
}

def analyze_prose(text: str, label: str = "sample") -> dict:
    """Quantitative prose metrics calculation for both Arabic and English."""
    if not text.strip():
        return {}

    words = text.split()
    word_count = len(words)
    is_ar = is_arabic_text(text)

    # Sentence analysis
    if is_ar:
        sentences = re.split(r'[\.\!\؟\n]+', text)
    else:
        sentences = re.split(r'[\.\!\?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip().split()) >= 2]
    sent_lengths = [len(s.split()) for s in sentences] if sentences else [0]

    # Paragraph analysis
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip() and not p.strip().startswith('#') and p.strip() != '---']
    para_lengths = [len(p.split()) for p in paragraphs] if paragraphs else [0]

    # Clean words
    lower_words = [w.lower().strip(".,;:!?\"'()—-–«»") for w in words]

    if is_ar:
        body_count = sum(1 for w in lower_words if any(k in w for k in WELL_BODY_AR))
        sensory_count = sum(1 for w in lower_words if any(k in w for k in WELL_SENSORY_AR))
        total_sensory = body_count + sensory_count or 1
        body_pct = round(body_count / total_sensory * 100, 1)
        trade_pct = round(sensory_count / total_sensory * 100, 1)
        musical_pct = 0.0
    else:
        musical_count = sum(1 for w in lower_words if w in WELL_MUSICAL_EN)
        trade_count = sum(1 for w in lower_words if w in WELL_TRADE_EN)
        body_count = sum(1 for w in lower_words if w in WELL_BODY_EN)
        total_well = musical_count + trade_count + body_count or 1
        musical_pct = round(musical_count / total_well * 100, 1)
        trade_pct = round(trade_count / total_well * 100, 1)
        body_pct = round(body_count / total_well * 100, 1)

    # Dialogue detection
    dialogue_matches = re.findall(r'[""«»][^""«»]*[""«»]|—\s*[^—\n]+', text)
    dialogue_words = sum(len(m.split()) for m in dialogue_matches)
    dialogue_ratio = round(dialogue_words / word_count, 3) if word_count > 0 else 0

    # Sentence variation metrics
    avg_sent = round(statistics.mean(sent_lengths), 1) if sent_lengths else 0
    std_sent = round(statistics.stdev(sent_lengths), 1) if len(sent_lengths) > 1 else 0
    cv_sent = round(std_sent / avg_sent, 3) if avg_sent > 0 else 0
    fragments = sum(1 for l in sent_lengths if l < 5)
    long_sents = sum(1 for l in sent_lengths if l > 30)

    return {
        "label": label,
        "is_arabic": is_ar,
        "word_count": word_count,
        "sentence_count": len(sentences),
        "paragraph_count": len(paragraphs),
        "avg_sentence_length": avg_sent,
        "sentence_length_std": std_sent,
        "sentence_length_cv": cv_sent,
        "min_sentence": min(sent_lengths) if sent_lengths else 0,
        "max_sentence": max(sent_lengths) if sent_lengths else 0,
        "fragments_pct": round(fragments / len(sentences) * 100, 1) if sentences else 0,
        "long_sentences_pct": round(long_sents / len(sentences) * 100, 1) if sentences else 0,
        "avg_paragraph_length": round(statistics.mean(para_lengths), 1) if para_lengths else 0,
        "well_musical_pct": musical_pct,
        "well_trade_pct": trade_pct,
        "well_body_pct": body_pct,
        "dialogue_ratio": dialogue_ratio,
    }

def main():
    parser = argparse.ArgumentParser(description="Voice Fingerprint Analyzer")
    parser.add_argument("--sample", type=str, help="Direct sample text to analyze")
    parser.add_argument("--file", type=str, help="Path to text file to analyze")
    args = parser.parse_args()

    results = {}

    if args.sample:
        metrics = analyze_prose(args.sample, "Sample Text")
        results["sample"] = metrics
        print(json.dumps(results, indent=2, ensure_ascii=False))
        return

    if args.file:
        p = Path(args.file)
        if p.exists():
            metrics = analyze_prose(p.read_text(encoding="utf-8"), p.name)
            results["sample"] = metrics
            print(json.dumps(results, indent=2, ensure_ascii=False))
            return

    # Analyze existing chapters in chapters/
    chapter_files = sorted(CHAPTERS_DIR.glob("ch_*.md"))
    if not chapter_files:
        print("No chapter files found in chapters/. Generating empty profile.")
        results["novel_average"] = {
            "word_count": 0, "avg_sentence_length": 0, "dialogue_ratio": 0, "well_body_pct": 0
        }
    else:
        for p in chapter_files:
            match = re.search(r"ch_(\d+)", p.name)
            ch_num = int(match.group(1)) if match else 1
            key = f"ch_{ch_num:02d}"
            results[key] = analyze_prose(p.read_text(encoding="utf-8"), key)

        # Novel average
        all_vals = [v for k, v in results.items() if k != "novel_average"]
        if all_vals:
            avg = {}
            for key in ["word_count", "avg_sentence_length", "sentence_length_cv", "fragments_pct", "long_sentences_pct", "dialogue_ratio", "well_body_pct", "well_trade_pct"]:
                vals = [r.get(key, 0) for r in all_vals if key in r]
                avg[key] = round(statistics.mean(vals), 2) if vals else 0
            results["novel_average"] = avg

    out_path = EDIT_LOGS_DIR / "voice_fingerprint.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"Voice fingerprint written to {out_path}")

if __name__ == "__main__":
    main()
