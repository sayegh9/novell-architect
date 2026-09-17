import re

with open("draft_chapter.py", "r") as f:
    content = f.read()

new_logic = """
        novel_type = os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel")
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
"""

content = re.sub(
    r'        prompt = draft_template\.format\([^)]+\)',
    new_logic.strip(),
    content,
    flags=re.DOTALL
)

with open("draft_chapter.py", "w") as f:
    f.write(content)
print("draft_chapter.py patched.")
