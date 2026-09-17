import re

with open("run_pipeline.py", "r") as f:
    content = f.read()

new_thresholds = """
NOVEL_TYPE = os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel")
FOUNDATION_THRESHOLD = 5.5 if NOVEL_TYPE == "novella" else 6.0
CHAPTER_THRESHOLD = 5.0 if NOVEL_TYPE == "novella" else 5.5
"""

content = re.sub(
    r'FOUNDATION_THRESHOLD = 6\.0\nCHAPTER_THRESHOLD = 5\.5',
    new_thresholds.strip(),
    content
)

with open("run_pipeline.py", "w") as f:
    f.write(content)
print("run_pipeline.py patched.")
