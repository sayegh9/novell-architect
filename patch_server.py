import re

with open("server.py", "r") as f:
    content = f.read()

new_content = """
def get_project_metadata(p_dir):
    import json
    meta = {
        "phase": "foundation",
        "chapters_drafted": 0,
        "chapters_total": 24,
        "language": "ar",
        "word_count": 0,
        "last_modified": 0,
    }
    state_file = p_dir / "state.json"
    if state_file.exists():
        try:
            state = json.loads(state_file.read_text(encoding="utf-8"))
            meta["phase"] = state.get("phase", "foundation")
            meta["chapters_drafted"] = state.get("chapters_drafted", 0)
            meta["chapters_total"] = state.get("chapters_total", 24)
            meta["last_modified"] = state_file.stat().st_mtime
        except Exception: pass
    
    settings_file = p_dir / "settings.json"
    if settings_file.exists():
        try:
            settings = json.loads(settings_file.read_text(encoding="utf-8"))
            meta["language"] = settings.get("AUTONOVEL_LANGUAGE", "ar")
        except Exception: pass

    ch_dir = p_dir / "chapters"
    if ch_dir.exists():
        for f in ch_dir.glob("ch_*.md"):
            try:
                meta["word_count"] += len(f.read_text(encoding="utf-8").split())
                meta["last_modified"] = max(meta["last_modified"], f.stat().st_mtime)
            except Exception: pass
            
    return meta

@app.get("/api/projects")
def api_list_projects():
    projects_dir = SCRIPT_DIR / "projects"
    projects_dir.mkdir(exist_ok=True)
    projects = []
    
    root_meta = get_project_metadata(SCRIPT_DIR)
    projects.append({
        "id": "root",
        "name": "Legacy Root Project",
        "path": str(SCRIPT_DIR),
        "is_active": str(PROJECT_DIR) == str(SCRIPT_DIR),
        **root_meta
    })

    for p in projects_dir.iterdir():
        if p.is_dir():
            p_meta = get_project_metadata(p)
            projects.append({
                "id": p.name,
                "name": p.name,
                "path": str(p),
                "is_active": str(PROJECT_DIR) == str(p),
                **p_meta
            })
    return {"projects": projects, "active_project": str(PROJECT_DIR)}


class CreateProjectRequest(BaseModel):
    name: str

@app.post("/api/projects")
def api_create_project(req: CreateProjectRequest):
    projects_dir = SCRIPT_DIR / "projects"
    projects_dir.mkdir(exist_ok=True)
    
    safe_name = re.sub(r'[^\w\u0600-\u06ff\-]', '_', req.name.strip())
    if not safe_name:
        raise HTTPException(400, "Invalid project name")
        
    p_dir = projects_dir / safe_name
    if p_dir.exists():
        raise HTTPException(400, "Project already exists")
        
    p_dir.mkdir()
    
    # Initialize basic files
    (p_dir / "seed.txt").write_text("", encoding="utf-8")
    default_state = {
        "phase": "foundation", "current_focus": "planning", "iteration": 0,
        "foundation_score": 0.0, "lore_score": 0.0, "chapters_drafted": 0,
        "chapters_total": 24, "novel_score": 0.0, "revision_cycle": 0, "debts": [],
        "novel_type": "novel"
    }
    (p_dir / "state.json").write_text(json.dumps(default_state, indent=2), encoding="utf-8")
    
    try:
        import subprocess
        subprocess.run(["git", "init"], cwd=str(p_dir), check=False)
    except Exception:
        pass
    
    return {"status": "created", "id": safe_name, "path": str(p_dir)}

@app.delete("/api/projects/{project_id}")
def api_delete_project(project_id: str):
    if project_id == "root":
        raise HTTPException(400, "Cannot delete root project")
    p_dir = SCRIPT_DIR / "projects" / project_id
    if not p_dir.exists() or not p_dir.is_dir():
        raise HTTPException(404, "Project not found")
        
    if str(PROJECT_DIR) == str(p_dir):
        # Fallback to root if deleting active project
        api_set_active_project(SetActiveProjectRequest(id="root"))
        
    import shutil
    shutil.rmtree(p_dir)
    return {"status": "deleted", "id": project_id}

class SetActiveProjectRequest(BaseModel):
    id: str

@app.post("/api/projects/set_active")
def api_set_active_project(req: SetActiveProjectRequest):
    global PROJECT_DIR
    global ORCHESTRATOR_LOG_PATH
    
    if req.id == "root":
        new_dir = SCRIPT_DIR
    else:
        new_dir = SCRIPT_DIR / "projects" / req.id
        if not new_dir.exists():
            raise HTTPException(404, "Project not found")
            
    PROJECT_DIR = new_dir.resolve()
    os.environ["AUTONOVEL_PROJECT_DIR"] = str(PROJECT_DIR)
    
    # Apply settings from the new project to environ
    settings_file = PROJECT_DIR / "settings.json"
    if settings_file.exists():
        try:
            import json
            settings = json.loads(settings_file.read_text(encoding="utf-8"))
            for k, v in settings.items():
                os.environ[k] = str(v)
        except Exception:
            pass
            
    ORCHESTRATOR_LOG_PATH = PROJECT_DIR / "autonovel-orchestrator.log"
    
    return {"status": "success", "active_project": str(PROJECT_DIR)}
"""

# We need to replace the content from `@app.get("/api/projects")` to the end of `api_set_active_project`
import re
start_pattern = r'@app\.get\("/api/projects"\)'
end_pattern = r'# ============================================================================\n# Static Files & UI Serving'

match_start = re.search(start_pattern, content)
match_end = re.search(end_pattern, content)

if match_start and match_end:
    updated = content[:match_start.start()] + new_content + "\n" + content[match_end.start():]
    with open("server.py", "w") as f:
        f.write(updated)
    print("Patched server.py successfully.")
else:
    print("Could not find patch points.")
