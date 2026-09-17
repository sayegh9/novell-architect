import re
with open("ui/src/services/api.ts", "r") as f:
    content = f.read()

new_content = """
export async function deleteProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || `Failed to delete project ${id}`);
  }
  return res.json();
}
"""

if "deleteProject" not in content:
    with open("ui/src/services/api.ts", "a") as f:
        f.write(new_content)
    print("API patched.")
