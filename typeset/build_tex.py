#!/usr/bin/env python3
"""Build LaTeX source from chapter files."""
import re
import os
import sys
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
CHAPTERS_DIR = BASE_DIR.parent / "chapters"
OUT_DIR = BASE_DIR

def latex_escape(t):
    t = t.replace('&', '\\&')
    t = t.replace('%', '\\%')
    t = t.replace('$', '\\$')
    t = t.replace('#', '\\#')
    t = t.replace('_', '\\_')
    return t

def md_to_latex(body):
    result = []
    for line in body.split('\n'):
        s = line.strip()
        if s == '---':
            result.append('\n\\scenebreak\n')
        elif s == '':
            result.append('')
        else:
            s = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'\\textit{\1}', s)
            s = latex_escape(s)
            s = s.replace('\u2014', '---')
            s = s.replace('\u2013', '--')
            s = s.replace('\u201c', '``')
            s = s.replace('\u201d', "''")
            s = s.replace('\u2018', '`')
            s = s.replace('\u2019', "'")
            s = s.replace('\u2026', '\\ldots{}')
            # Convert straight ASCII quotes to LaTeX open/close
            s = re.sub(r'(?<=\s)"(?=\w)', '``', s)
            s = re.sub(r'^"(?=\w)', '``', s)
            s = re.sub(r'(?<=\w)"(?=[\s.,;:!?\-])', "''", s)
            s = re.sub(r'(?<=\w)"$', "''", s)
            s = re.sub(r'(?<=[\.\?\!])"', "''", s)
            s = re.sub(r'(?<=\s)"', '``', s)
            s = re.sub(r'"(?=\s)', "''", s)
            s = re.sub(r'^"', '``', s)
            result.append(s)
    return '\n'.join(result)

def make_drop_cap(latex_body):
    """Extract first paragraph and wrap first letter in lettrine."""
    lines = latex_body.split('\n')
    first_para = []
    rest_start = 0
    found = False
    
    for i, l in enumerate(lines):
        if not found and l.strip():
            found = True
        if found:
            if l.strip() == '' or l.strip().startswith('\\scenebreak'):
                rest_start = i
                break
            first_para.append(l)
        else:
            rest_start = i + 1
    
    if not first_para:
        return latex_body
    
    para_text = ' '.join(first_para)
    rest = '\n'.join(lines[rest_start:])
    
    if len(para_text) < 2:
        return latex_body
    
    first_letter = para_text[0]
    after_first = para_text[1:]
    
    space_idx = after_first.find(' ')
    if space_idx > 0:
        word_rest = after_first[:space_idx]
        para_rest = after_first[space_idx:]
    else:
        word_rest = after_first
        para_rest = ""
    
    drop = f"\\lettrine[lines=2, lhang=0.1, nindent=0.2em]{{{first_letter}}}{{{word_rest}}}{para_rest}"
    return drop + '\n\n' + rest

def main():
    chapter_files = sorted(CHAPTERS_DIR.glob("ch_*.md"))
    if not chapter_files:
        print("WARNING: No chapters found in chapters/ to typeset.", file=sys.stderr)
        return

    chapters_tex = []
    for path in chapter_files:
        m = re.search(r"ch_(\d+)", path.name)
        n = int(m.group(1)) if m else 0
        text = path.read_text(encoding="utf-8")
        lines = text.strip().split('\n')
        title_line = lines[0].lstrip('# ').strip() if lines else f"Chapter {n}"
        body = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""
        
        if ': ' in title_line:
            label, subtitle = title_line.split(': ', 1)
        else:
            label, subtitle = title_line, ""
        
        chapter_name = subtitle if subtitle else label
        latex_body = md_to_latex(body)
        latex_body = make_drop_cap(latex_body)
        
        art_base = BASE_DIR.parent
        pdf_path = art_base / "art" / "pdf" / f"ornament_ch{n:02d}.pdf"
        png_path = art_base / "art" / f"ornament_ch{n:02d}.png"
        ornament_tex = ""
        if pdf_path.exists():
            ornament_tex = f"\\begin{{center}}\n\\includegraphics[width=0.8in]{{{pdf_path}}}\n\\end{{center}}\n\\vspace{{0.15in}}\n"
        elif png_path.exists():
            ornament_tex = f"\\begin{{center}}\n\\includegraphics[width=0.8in]{{{png_path}}}\n\\end{{center}}\n\\vspace{{0.15in}}\n"
        
        chapters_tex.append(f"\\chapter{{{latex_escape(chapter_name)}}}\n\n{ornament_tex}{latex_body}\n")
        print(f"  {n:2d}. {title_line}")

    content = '\n\\clearpage\n\n'.join(chapters_tex)
    out_file = OUT_DIR / "chapters_content.tex"
    out_file.write_text(content, encoding="utf-8")
    print(f"\nWrote {len(chapters_tex)} chapters to typeset/chapters_content.tex")

if __name__ == "__main__":
    main()
