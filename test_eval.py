import sys
from evaluate import evaluate_chapter
import json

res = evaluate_chapter(1)
print(json.dumps(res, indent=2, ensure_ascii=False))
