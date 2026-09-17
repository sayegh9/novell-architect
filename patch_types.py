import re

with open("ui/src/types.ts", "r") as f:
    content = f.read()

# Update ProjectState
content = re.sub(
    r'(debts: string\[\];\n})',
    r'\1'.replace('}', '  novel_type?: string;\n}'),
    content
)

# Update EngineSettings
content = re.sub(
    r'(language: string;)',
    r'\1\n  novel_type: string;',
    content
)

with open("ui/src/types.ts", "w") as f:
    f.write(content)
print("types.ts patched.")
