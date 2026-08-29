#!/usr/bin/env python3
"""
server.py -- FastAPI backend server for Autonovel Studio.

Provides REST APIs and WebSocket streaming for:
- Project state and history tracking (state.json, results.tsv)
- Interactive document reading and editing
- Chapter management and evaluation inspection
- Subprocess execution with live WebSocket console broadcasting
- Serving the built Studio UI
"""

import os
import sys
import json
import asyncio
import glob
import re
import signal
from pathlib import Path
from typing import Optional, List, Dict, Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent.resolve()
load_dotenv(BASE_DIR / ".env", override=True)

app = FastAPI(title="Autonovel Studio API", version="1.0.0")

# Enable CORS for local development (e.g. Vite on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Global Process Execution State
class JobState:
    def __init__(self):
        self.is_running = False
        self.current_cmd = ""
        self.current_process: Optional[asyncio.subprocess.Process] = None
        self.logs: List[str] = []

job_state = JobState()


# ============================================================================
# Helpers
# ============================================================================

def get_state() -> dict:
    state_file = BASE_DIR / "state.json"
    if state_file.exists():
        try:
            data = json.loads(state_file.read_text())
            chapters_dir = BASE_DIR / "chapters"
            actual_count = len(list(chapters_dir.glob("ch_*.md"))) if chapters_dir.exists() else 0
            if actual_count == 0 and data.get("chapters_drafted", 0) > 0:
                data["chapters_drafted"] = 0
                data["phase"] = "foundation"
                state_file.write_text(json.dumps(data, indent=2))
            elif data.get("chapters_drafted", 0) > actual_count:
                data["chapters_drafted"] = actual_count
                state_file.write_text(json.dumps(data, indent=2))
            return data
        except Exception:
            pass
    return {
        "phase": "foundation",

        "current_focus": "planning",
        "iteration": 0,
        "foundation_score": 0.0,
        "lore_score": 0.0,
        "chapters_drafted": 0,
        "chapters_total": 0,
        "novel_score": 0.0,
        "revision_cycle": 0,
        "debts": [],
    }

def get_results_tsv() -> List[dict]:
    results_file = BASE_DIR / "results.tsv"
    if not results_file.exists():
        return []
    lines = results_file.read_text().splitlines()
    if len(lines) <= 1:
        return []
    header = lines[0].split("\t")
    rows = []
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= len(header):
            rows.append(dict(zip(header, parts)))
    return rows


# ============================================================================
# REST Endpoints: State & Documents
# ============================================================================

@app.get("/api/state")
def api_get_state():
    """Get project state, statistics, and run logs."""
    state = get_state()
    results = get_results_tsv()
    
    # Calculate word count & chapters count
    chapters_dir = BASE_DIR / "chapters"
    chapters_list = []
    total_words = 0
    if chapters_dir.exists():
        for ch_file in sorted(chapters_dir.glob("ch_*.md")):
            text = ch_file.read_text()
            wc = len(text.split())
            total_words += wc
            title = text.split("\n")[0].lstrip("# ").strip() if text else ch_file.stem
            match = re.search(r"ch_(\d+)", ch_file.name)
            ch_num = int(match.group(1)) if match else 0
            chapters_list.append({
                "number": ch_num,
                "filename": ch_file.name,
                "title": title,
                "word_count": wc,
            })

    return {
        "state": state,
        "results": results,
        "chapters": chapters_list,
        "total_words": total_words,
        "chapters_count": len(chapters_list),
        "is_job_running": job_state.is_running,
        "current_cmd": job_state.current_cmd,
        "env_keys": {
            "has_gemini": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
            "has_anthropic": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "writer_model": os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-2.5-pro"),
            "judge_model": os.environ.get("AUTONOVEL_JUDGE_MODEL", "gemini-2.5-pro"),
        }
    }


@app.get("/api/files")
def api_list_files():
    """List planning files and their existence/sizes."""
    doc_keys = [
        "seed.txt", "world.md", "characters.md", "outline.md",
        "voice.md", "canon.md", "MYSTERY.md", "arc_summary.md",
        "reviews.md", "CRAFT.md", "ANTI-SLOP.md", "ANTI-PATTERNS.md"
    ]
    files = []
    for k in doc_keys:
        p = BASE_DIR / k
        files.append({
            "name": k,
            "exists": p.exists(),
            "size": p.stat().st_size if p.exists() else 0,
            "modified": p.stat().st_mtime if p.exists() else None,
        })
    return files


@app.get("/api/files/{filename}")
def api_read_file(filename: str):
    """Read a specific planning document."""
    # Sanitize path
    safe_filename = Path(filename).name
    p = BASE_DIR / safe_filename
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"File {safe_filename} not found")
    return {
        "filename": safe_filename,
        "content": p.read_text(),
        "size": p.stat().st_size,
    }


class SaveFileRequest(BaseModel):
    content: str

@app.post("/api/files/{filename}")
def api_save_file(filename: str, req: SaveFileRequest):
    """Save content to a planning document."""
    safe_filename = Path(filename).name
    p = BASE_DIR / safe_filename
    p.write_text(req.content)
    return {"status": "saved", "filename": safe_filename, "size": len(req.content)}


@app.get("/api/chapters/{ch_num}")
def api_get_chapter(ch_num: int):
    """Get a chapter's content and latest evaluation/cut logs."""
    ch_path = BASE_DIR / "chapters" / f"ch_{ch_num:02d}.md"
    if not ch_path.exists():
        raise HTTPException(status_code=404, detail=f"Chapter {ch_num} not found")
    
    content = ch_path.read_text()
    title = content.split("\n")[0].lstrip("# ").strip() if content else f"Chapter {ch_num}"
    
    # Check for cuts in edit_logs
    cuts_file = BASE_DIR / "edit_logs" / f"ch{ch_num:02d}_cuts.json"
    cuts_data = None
    if cuts_file.exists():
        try:
            cuts_data = json.loads(cuts_file.read_text())
        except Exception:
            pass

    return {
        "chapter": ch_num,
        "title": title,
        "content": content,
        "word_count": len(content.split()),
        "cuts": cuts_data,
    }


class SaveChapterRequest(BaseModel):
    content: str

@app.post("/api/chapters/{ch_num}")
def api_save_chapter(ch_num: int, req: SaveChapterRequest):
    """Save edited prose for a chapter."""
    chapters_dir = BASE_DIR / "chapters"
    chapters_dir.mkdir(exist_ok=True)
    ch_path = chapters_dir / f"ch_{ch_num:02d}.md"
    ch_path.write_text(req.content)
    return {
        "status": "saved",
        "chapter": ch_num,
        "word_count": len(req.content.split())
    }


@app.get("/api/logs/eval")
def api_get_eval_logs():
    """List all evaluation logs."""
    logs_dir = BASE_DIR / "eval_logs"
    if not logs_dir.exists():
        return []
    logs = []
    for f in sorted(logs_dir.glob("*.json"), reverse=True):
        try:
            data = json.loads(f.read_text())
            logs.append({
                "filename": f.name,
                "timestamp": f.stat().st_mtime,
                "data": data,
            })
        except Exception:
            pass
    return logs


@app.get("/api/logs/edit")
def api_get_edit_logs():
    """Get editorial tournament, reader panel, and review logs."""
    edit_dir = BASE_DIR / "edit_logs"
    if not edit_dir.exists():
        return {}

    tournament = None
    panel = None
    reviews = []
    cuts = []

    t_file = edit_dir / "tournament_results.json"
    if t_file.exists():
        try: tournament = json.loads(t_file.read_text())
        except Exception: pass

    p_file = edit_dir / "reader_panel.json"
    if p_file.exists():
        try: panel = json.loads(p_file.read_text())
        except Exception: pass

    for r_file in sorted(edit_dir.glob("*_review.json"), reverse=True):
        try:
            reviews.append(json.loads(r_file.read_text()))
        except Exception: pass

    for c_file in sorted(edit_dir.glob("ch*_cuts.json")):
        try:
            cuts.append({
                "filename": c_file.name,
                "data": json.loads(c_file.read_text())
            })
        except Exception: pass

    return {
        "tournament": tournament,
        "reader_panel": panel,
        "reviews": reviews,
        "cuts": cuts,
    }


# ============================================================================
# Action Trigger & Execution Engine
# ============================================================================

class RunActionRequest(BaseModel):
    action: str
    params: Dict[str, Any] = {}

async def run_command_stream(cmd: str):
    """Execute a shell command and stream output line by line over WebSocket."""
    job_state.is_running = True
    job_state.current_cmd = cmd
    job_state.logs.clear()
    
    await manager.broadcast({
        "type": "job_start",
        "cmd": cmd,
    })

    try:
        process = await asyncio.create_subprocess_shell(
            f'"{sys.executable}" {cmd}',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(BASE_DIR),
        )
        job_state.current_process = process

        while True:
            line = await process.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace")
            job_state.logs.append(text)
            await manager.broadcast({
                "type": "log",
                "text": text,
            })

        await process.wait()
        returncode = process.returncode
        await manager.broadcast({
            "type": "job_end",
            "returncode": returncode,
            "cmd": cmd,
        })
    except Exception as e:
        err_msg = f"\nError executing process: {str(e)}\n"
        job_state.logs.append(err_msg)
        await manager.broadcast({
            "type": "log",
            "text": err_msg,
        })
        await manager.broadcast({
            "type": "job_end",
            "returncode": -1,
            "cmd": cmd,
        })
    finally:
        job_state.is_running = False
        job_state.current_process = None


@app.post("/api/actions/run")
async def api_run_action(req: RunActionRequest, background_tasks: BackgroundTasks):
    """Trigger a tool or pipeline action."""
    if job_state.is_running:
        raise HTTPException(status_code=400, detail="A job is already running")

    action = req.action
    params = req.params

    cmd = ""
    if action == "seed":
        count = params.get("count", 10)
        riff = params.get("riff")
        if riff:
            cmd = f'seed.py --riff "{riff}"'
        else:
            cmd = f"seed.py --count {count}"
    elif action == "gen_world":
        cmd = "gen_world.py"
    elif action == "gen_characters":
        cmd = "gen_characters.py"
    elif action == "gen_outline":
        cmd = "gen_outline.py"
    elif action == "gen_outline_part2":
        cmd = "gen_outline_part2.py"
    elif action == "gen_canon":
        cmd = "gen_canon.py"
    elif action == "voice_fingerprint":
        cmd = "voice_fingerprint.py"
    elif action == "draft_chapter":
        ch_num = params.get("chapter", 1)
        cmd = f"draft_chapter.py {ch_num}"
    elif action == "evaluate_foundation":
        cmd = "evaluate.py --phase=foundation"
    elif action == "evaluate_chapter":
        ch_num = params.get("chapter", 1)
        cmd = f"evaluate.py --chapter={ch_num}"
    elif action == "evaluate_full":
        cmd = "evaluate.py --full"
    elif action == "adversarial_edit":
        ch = params.get("chapter", "all")
        cmd = f"adversarial_edit.py {ch}"
    elif action == "compare_chapters":
        cmd = "compare_chapters.py"
    elif action == "reader_panel":
        cmd = "reader_panel.py"
    elif action == "review":
        cmd = "review.py"
    elif action == "run_pipeline":
        phase = params.get("phase")
        from_scratch = params.get("from_scratch", False)
        max_cycles = params.get("max_cycles", 6)
        args = []
        if from_scratch:
            args.append("--from-scratch")
        if phase:
            args.append(f"--phase {phase}")
        if max_cycles:
            args.append(f"--max-cycles {max_cycles}")
        cmd = f"run_pipeline.py {' '.join(args)}"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    background_tasks.add_task(run_command_stream, cmd)
    return {"status": "started", "cmd": cmd}


@app.post("/api/actions/stop")
def api_stop_action():
    """Cancel current background job."""
    if not job_state.is_running or not job_state.current_process:
        return {"status": "idle"}
    try:
        job_state.current_process.send_signal(signal.SIGTERM)
        return {"status": "stopping"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/actions/logs")
def api_get_logs():
    """Get current console logs."""
    return {
        "is_running": job_state.is_running,
        "cmd": job_state.current_cmd,
        "logs": job_state.logs,
    }


# ============================================================================
# WebSocket Stream
# ============================================================================

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current status on connect
        await websocket.send_json({
            "type": "connected",
            "is_running": job_state.is_running,
            "cmd": job_state.current_cmd,
            "logs_preview": job_state.logs[-50:] if job_state.logs else [],
        })
        while True:
            # Keepalive / ping-pong
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ============================================================================
# Static Files & UI Serving
# ============================================================================

ui_dist = BASE_DIR / "ui" / "dist"
if ui_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(ui_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404)
        target = ui_dist / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(ui_dist / "index.html")


# ============================================================================
# Main Entrypoint
# ============================================================================

def main():
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Autonovel Studio Backend on http://127.0.0.1:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

if __name__ == "__main__":
    main()
