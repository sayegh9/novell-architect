#!/usr/bin/env python3
"""
Draft a single chapter using the writer model (Segmented Drafting).
Supports both Arabic and English novel pipelines automatically.
Usage: python draft_chapter.py 1
"""
import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env")

from llm import call_writer as _call_writer
from language_utils import detect_project_language, load_prompt, clean_chapter_text
from outline_utils import extract_chapter_outline, extract_next_chapter_outline

CHAPTERS_DIR = BASE_DIR / "chapters"
CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)

def call_writer(prompt, system_prompt, max_tokens=16000):
    return _call_writer(prompt, system=system_prompt, max_tokens=max_tokens, temperature=0.8, timeout=600)

def load_file(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""

def chunk_outline(outline_text: str, num_chunks: int = 3) -> list[str]:
    """Split the outline entry into roughly equal chunks of lines/beats."""
    lines = [line.strip() for line in outline_text.split('\n') if line.strip()]
    
    # If the outline is very short, don't chunk too much
    if len(lines) <= 4:
        return ["\n".join(lines)]
        
    chunk_size = max(1, len(lines) // num_chunks)
    chunks = []
    
    for i in range(0, len(lines), chunk_size):
        chunk_lines = lines[i:i + chunk_size]
        if chunk_lines:
            chunks.append("\n".join(chunk_lines))
            
    # If division left a tiny tail, merge it with the last chunk
    if len(chunks) > num_chunks:
        tail = chunks.pop()
        chunks[-1] = chunks[-1] + "\n" + tail
        
    return chunks


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
    
    # Load Prompts dynamically
    system_prompt = load_prompt("writer_system")
    draft_template = load_prompt("draft_segment")
    lang = detect_project_language()
    is_arabic = lang == "ar"
    novel_type = os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel")
    
    # Chapter-specific context
    chapter_outline = extract_chapter_outline(outline, chapter_num)
    
    # Split the outline into 3 segments for iterative generation
    outline_segments = chunk_outline(chapter_outline, num_chunks=3)
    
    # Previous chapter (if exists)
    prev_path = CHAPTERS_DIR / f"ch_{chapter_num - 1:02d}.md"
    prev_tail = ""
    if prev_path.exists():
        try:
            prev_text = prev_path.read_text(encoding="utf-8")
            prev_tail = prev_text[-2000:] if len(prev_text) > 2000 else prev_text
        except Exception:
            pass

    print(f"Drafting Chapter {chapter_num} in {len(outline_segments)} segments...", flush=True)
    
    accumulated_text = ""
    
    for i, current_beats in enumerate(outline_segments):
        print(f"  -> Generating Segment {i+1}/{len(outline_segments)}...", flush=True)
        
        # Build context for previous scenes
        if i == 0:
            previous_scenes_text = f"PREVIOUS CHAPTER TAIL:\n{prev_tail}\n\n(Start the new chapter directly after this.)"
        else:
            previous_scenes_text = accumulated_text[-3000:] # Only show last ~3000 chars for context limits
        
        if is_arabic:
            len_inst = "استهدف كتابة ما بين 600 إلى 800 كلمة لهذا الجزء وحده." if novel_type == "novella" else "استهدف كتابة ما بين 800 إلى 1200 كلمة لهذا الجزء وحده."
        else:
            len_inst = "Target 600 to 800 words for this specific segment." if novel_type == "novella" else "Target 800 to 1200 words for this specific segment."
            
        prompt = draft_template.format(
            chapter_num=chapter_num,
            seed=seed,
            world=world,
            characters=characters,
            voice=voice,
            chapter_outline=chapter_outline,
            previous_scenes_text=previous_scenes_text,
            current_beats=current_beats,
            target_length_instruction=len_inst
        )
        
        segment_text = call_writer(prompt, system_prompt=system_prompt)
        
        # Clean segment
        segment_text = clean_chapter_text(segment_text, chapter_num=chapter_num)
        
        if i > 0:
            # Strip the title from subsequent segments if the LLM adds it
            segment_text = re.sub(r'^#+ .*?\n+', '', segment_text).strip()
            
        accumulated_text += "\n\n" + segment_text
        accumulated_text = accumulated_text.strip()
    
    # Final cleanup
    accumulated_text = clean_chapter_text(accumulated_text, chapter_num=chapter_num)
    
    out_path = CHAPTERS_DIR / f"ch_{chapter_num:02d}.md"
    out_path.write_text(accumulated_text, encoding="utf-8")
    
    words = len(accumulated_text.split())
    print(f"Chapter {chapter_num} written successfully: {words} words -> {out_path}")

if __name__ == "__main__":
    main()
