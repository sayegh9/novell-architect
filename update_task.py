import re

with open("/Users/ahmedelsayegh/.gemini/antigravity/brain/81652547-5801-429b-a958-63aadcc9483a/task.md", "r") as f:
    text = f.read()

def replace_section(m):
    return m.group(0).replace('- [ ]', '- [x]').replace('- [/]', '- [x]')

text = re.sub(r'## 4\. Short Novel \(Novella\) Mode.*', replace_section, text, flags=re.DOTALL)

with open("/Users/ahmedelsayegh/.gemini/antigravity/brain/81652547-5801-429b-a958-63aadcc9483a/task.md", "w") as f:
    f.write(text)
