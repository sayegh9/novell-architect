import re

with open("server.py", "r") as f:
    content = f.read()

# Update get settings
get_settings_re = r'("language": [^\n]+,)\n(\s+"has_gemini_key")'
content = re.sub(get_settings_re, r'\1\n        "novel_type": os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel"),\n\2', content)

# Update model
model_re = r'(language: Optional\[str\] = None)\n'
content = re.sub(model_re, r'\1\n    novel_type: Optional[str] = None\n', content)

# Update api_update_settings
update_re = r'(if req\.language is not None:\n\s+env_map\["AUTONOVEL_LANGUAGE"\] = req\.language\n\s+os\.environ\["AUTONOVEL_LANGUAGE"\] = req\.language)\n'
content = re.sub(update_re, r'\1\n    if req.novel_type is not None:\n        env_map["AUTONOVEL_NOVEL_TYPE"] = req.novel_type\n        os.environ["AUTONOVEL_NOVEL_TYPE"] = req.novel_type\n', content)

with open("server.py", "w") as f:
    f.write(content)
print("Settings patched.")
