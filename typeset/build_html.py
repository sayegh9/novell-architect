import os
import glob
import markdown
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent.parent)).resolve()
CHAPTERS_DIR = BASE_DIR / "chapters"
OUTPUT_HTML = BASE_DIR / "manuscript.html"

def build_html():
    chapters = sorted(glob.glob(str(CHAPTERS_DIR / "ch_*.md")))
    if not chapters:
        print("No chapters found.")
        return

    html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مادة خام</title>
    <style>
        body {
            font-family: 'Amiri', 'Traditional Arabic', serif;
            font-size: 1.3em;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #fafafa;
        }
        h1 {
            font-size: 2em;
            margin-top: 2em;
            margin-bottom: 1em;
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        p {
            margin-bottom: 1.2em;
            text-align: justify;
        }
        .chapter-break {
            page-break-before: always;
            margin-top: 4em;
        }
    </style>
</head>
<body>
    <h1 style="border:none; font-size:3em;">مادة خام</h1>
"""
    
    for ch_path in chapters:
        text = Path(ch_path).read_text(encoding="utf-8")
        html = markdown.markdown(text)
        html_content += f'\n<div class="chapter-break"></div>\n{html}\n'
        
    html_content += "\n</body>\n</html>"
    
    OUTPUT_HTML.write_text(html_content, encoding="utf-8")
    print(f"Generated {OUTPUT_HTML}")

if __name__ == "__main__":
    build_html()
