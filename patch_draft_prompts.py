import re

for path in ["prompts/ar/draft_segment.txt", "prompts/en/draft_segment.txt"]:
    try:
        with open(path, "r") as f:
            content = f.read()
            
        content = re.sub(
            r'(-\s*استهدف كتابة ما بين 800 إلى 1200 كلمة لهذا الجزء وحده\.|-\s*Target 800 to 1200 words for this specific segment\.)',
            r'- {target_length_instruction}',
            content
        )
        
        with open(path, "w") as f:
            f.write(content)
        print(f"Patched {path}")
    except Exception as e:
        print(f"Failed to patch {path}: {e}")
