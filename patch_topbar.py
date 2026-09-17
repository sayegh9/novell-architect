import re

with open("ui/src/components/Topbar.tsx", "r") as f:
    content = f.read()

# Update initial state
content = re.sub(
    r"(language: 'ar',)",
    r"\1\n    novel_type: 'novel',",
    content
)

# Insert the new select before Language Default
new_select = """
              {/* Novel Type */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('settings.novel_type') || 'Novel Type'}</label>
                <select
                  value={settings.novel_type || 'novel'}
                  onChange={(e) => setSettings({ ...settings, novel_type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                >
                  <option value="novel">Standard Novel (Full-length epic)</option>
                  <option value="novella">Novella (Short, compressed structure)</option>
                </select>
              </div>
"""

content = re.sub(
    r"({\/\* Language Default \*\/})",
    new_select.strip() + "\n\n              \\1",
    content
)

with open("ui/src/components/Topbar.tsx", "w") as f:
    f.write(content)
print("Topbar patched.")
