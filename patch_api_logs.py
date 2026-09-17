with open("ui/src/services/api.ts", "r") as f:
    content = f.read()

new_exports = """
export async function fetchRevisionHealth() {
  const res = await fetch(`${API_BASE}/analytics/revision_health`);
  if (!res.ok) throw new Error('Failed to fetch revision health');
  return res.json();
}

export async function fetchEvalLog(chNum: number) {
  const res = await fetch(`${API_BASE}/logs/eval/${chNum}`);
  if (!res.ok) throw new Error(`Failed to fetch eval log for chapter ${chNum}`);
  return res.json();
}
"""

if "fetchRevisionHealth" not in content:
    with open("ui/src/services/api.ts", "a") as f:
        f.write("\n" + new_exports)
    print("API logs patched.")
