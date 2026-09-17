import re

with open("server.py", "r") as f:
    content = f.read()

new_content = """
@app.get("/api/logs/eval/{ch_num}")
def api_get_eval_log_single(ch_num: str):
    import json
    logs_dir = PROJECT_DIR / "eval_logs"
    try:
        ch_int = int(ch_num)
        p1 = logs_dir / f"eval_ch{ch_int:02d}.json"
        p2 = logs_dir / f"eval_ch{ch_int}.json"
        if p1.exists(): return json.loads(p1.read_text(encoding="utf-8"))
        if p2.exists(): return json.loads(p2.read_text(encoding="utf-8"))
    except Exception:
        pass
    raise HTTPException(status_code=404, detail="Eval log not found")

@app.get("/api/analytics/revision_health")
def api_get_revision_health():
    import json
    state_file = PROJECT_DIR / "state.json"
    tsv_path = PROJECT_DIR / "results.tsv"
    
    current_cycle = 0
    if state_file.exists():
        try: current_cycle = json.loads(state_file.read_text(encoding="utf-8")).get("revision_cycle", 0)
        except Exception: pass
        
    score_delta = 0.0
    plateau_approaching = False
    
    if tsv_path.exists():
        lines = [l.strip() for l in tsv_path.read_text(encoding="utf-8").split("\\n") if l.strip()]
        if len(lines) > 1:
            header = lines[0].split("\\t")
            if "score" in header and "phase" in header:
                s_idx = header.index("score")
                p_idx = header.index("phase")
                scores = []
                for l in reversed(lines[1:]):
                    parts = l.split("\\t")
                    if len(parts) > max(s_idx, p_idx) and parts[p_idx] == "export":
                        pass # Ignore export row
                    elif len(parts) > max(s_idx, p_idx) and parts[s_idx] != "-":
                        try: scores.append(float(parts[s_idx]))
                        except Exception: pass
                if len(scores) >= 2:
                    score_delta = round(scores[0] - scores[1], 2)
                    plateau_approaching = score_delta < 0.5
                    
    ready_to_export = plateau_approaching and current_cycle >= 2
    
    return {
        "current_cycle": current_cycle,
        "score_delta": score_delta,
        "plateau_approaching": plateau_approaching,
        "opus_items_qualified_pct": 0.0,
        "ready_to_export": ready_to_export
    }

"""

# Insert right before `# ============================================================================`
# `# Editorial, Cuts & Briefs Endpoints`
insert_point = r'# ============================================================================\n# Editorial, Cuts & Briefs Endpoints'

match = re.search(insert_point, content)
if match:
    updated = content[:match.start()] + new_content + "\n" + content[match.start():]
    with open("server.py", "w") as f:
        f.write(updated)
    print("Patched server logs API successfully.")
else:
    print("Could not find insert point.")

