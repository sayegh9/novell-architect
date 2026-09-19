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
import statistics
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from typing import Optional, List, Dict, Any, Callable, Mapping, Sequence

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from outline_utils import find_chapter_outline, replace_chapter_outline

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", SCRIPT_DIR)).resolve()
load_dotenv(SCRIPT_DIR / ".env", override=True)

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
    state_file = PROJECT_DIR / "state.json"
    if state_file.exists():
        try:
            data = json.loads(state_file.read_text())
            if isinstance(data.get("state"), dict):
                nested = data.pop("state")
                for k, v in nested.items():
                    if k not in data:
                        data[k] = v
                state_file.write_text(json.dumps(data, indent=2))
            chapters_dir = PROJECT_DIR / "chapters"
            actual_count = len(list(chapters_dir.glob("ch_*.md"))) if chapters_dir.exists() else 0
            if actual_count == 0 and data.get("chapters_drafted", 0) > 0:
                data["chapters_drafted"] = 0
                data["phase"] = "foundation"
                state_file.write_text(json.dumps(data, indent=2))
            elif data.get("chapters_drafted", 0) > actual_count:
                data["chapters_drafted"] = actual_count
                state_file.write_text(json.dumps(data, indent=2))

            # Auto-sync foundation_score if 0.0 or unset from latest foundation eval log
            if float(data.get("foundation_score", 0.0)) == 0.0:
                eval_logs_dir = PROJECT_DIR / "eval_logs"
                if eval_logs_dir.exists():
                    f_logs = sorted(eval_logs_dir.glob("*_foundation.json"), reverse=True)
                    if f_logs:
                        try:
                            f_data = json.loads(f_logs[0].read_text(encoding="utf-8"))
                            updated = False
                            if "overall_score" in f_data:
                                data["foundation_score"] = float(f_data["overall_score"])
                                updated = True
                            if "lore_score" in f_data:
                                data["lore_score"] = float(f_data["lore_score"])
                                updated = True
                            if updated:
                                state_file.write_text(json.dumps(data, indent=2))
                        except Exception:
                            pass

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
    results_file = PROJECT_DIR / "results.tsv"
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
    chapters_dir = PROJECT_DIR / "chapters"
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
        "project_name": PROJECT_DIR.name,
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
        p = PROJECT_DIR / k
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
    p = PROJECT_DIR / safe_filename
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
    p = PROJECT_DIR / safe_filename
    p.write_text(req.content)
    return {"status": "saved", "filename": safe_filename, "size": len(req.content)}


@app.get("/api/chapters/{ch_num}")
def api_get_chapter(ch_num: int):
    """Get a chapter's content and latest evaluation/cut logs."""
    ch_path = PROJECT_DIR / "chapters" / f"ch_{ch_num:02d}.md"
    if not ch_path.exists():
        raise HTTPException(status_code=404, detail=f"Chapter {ch_num} not found")
    
    content = ch_path.read_text()
    raw_first_line = content.split("\n")[0].strip() if content else f"Chapter {ch_num}"
    title = re.sub(r'^[#\s\*]+|[#\s\*]+$', '', raw_first_line).strip() or f"Chapter {ch_num}"
    
    # Check for cuts in edit_logs
    cuts_file = PROJECT_DIR / "edit_logs" / f"ch{ch_num:02d}_cuts.json"
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
    chapters_dir = PROJECT_DIR / "chapters"
    chapters_dir.mkdir(exist_ok=True)
    ch_path = chapters_dir / f"ch_{ch_num:02d}.md"
    ch_path.write_text(req.content)
    return {
        "status": "saved",
        "chapter": ch_num,
        "word_count": len(req.content.split())
    }


class SaveChapterBeatsRequest(BaseModel):
    beats: str


def _read_outline_for_beats(ch_num: int) -> tuple[Path, str]:
    if ch_num < 1:
        raise HTTPException(
            status_code=400, detail="Chapter number must be a positive integer"
        )

    outline_path = PROJECT_DIR / "outline.md"
    if not outline_path.is_file():
        raise HTTPException(status_code=404, detail="outline.md not found")
    with outline_path.open("r", encoding="utf-8", newline="") as outline_file:
        return outline_path, outline_file.read()


@app.get("/api/chapters/{ch_num}/beats")
def api_get_chapter_beats(ch_num: int):
    """Return the selected chapter's full Markdown outline section."""
    _, outline_text = _read_outline_for_beats(ch_num)
    beats = find_chapter_outline(outline_text, ch_num)
    if beats is None:
        raise HTTPException(
            status_code=404,
            detail=f"Chapter {ch_num} section not found in outline.md",
        )

    first_line = beats.splitlines()[0]
    title = re.sub(r"^[#\s*]+|[#\s*]+$", "", first_line).strip()
    return {
        "chapter": ch_num,
        "title": title,
        "beats": beats,
        "exists": True,
    }


@app.post("/api/chapters/{ch_num}/beats")
def api_save_chapter_beats(ch_num: int, req: SaveChapterBeatsRequest):
    """Replace one outline section after validation, preserving a full backup."""
    outline_path, outline_text = _read_outline_for_beats(ch_num)
    try:
        updated_outline = replace_chapter_outline(outline_text, ch_num, req.beats)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    backup_dir = PROJECT_DIR / "outline_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    backup_path = backup_dir / f"outline_{timestamp}.md"
    with backup_path.open("w", encoding="utf-8", newline="") as backup_file:
        backup_file.write(outline_text)
    with outline_path.open("w", encoding="utf-8", newline="") as outline_file:
        outline_file.write(updated_outline)

    saved_beats = find_chapter_outline(updated_outline, ch_num)
    return {
        "status": "saved",
        "chapter": ch_num,
        "backup": str(backup_path.relative_to(PROJECT_DIR)),
        "beats": saved_beats,
    }


@app.get("/api/logs/eval")
def api_get_eval_logs():
    """List all evaluation logs."""
    logs_dir = PROJECT_DIR / "eval_logs"
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
    edit_dir = PROJECT_DIR / "edit_logs"
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
        lines = [l.strip() for l in tsv_path.read_text(encoding="utf-8").split("\n") if l.strip()]
        if len(lines) > 1:
            header = lines[0].split("\t")
            if "score" in header and "phase" in header:
                s_idx = header.index("score")
                p_idx = header.index("phase")
                scores = []
                for l in reversed(lines[1:]):
                    parts = l.split("\t")
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


# ============================================================================
# Editorial, Cuts & Briefs Endpoints
# ============================================================================

class ApplyCutsCustomRequest(BaseModel):
    chapter: int
    quotes: List[str]

@app.post("/api/editorial/apply_cuts_custom")
def api_apply_cuts_custom(req: ApplyCutsCustomRequest):
    """Surgically remove specific quotes from a chapter."""
    ch_path = PROJECT_DIR / "chapters" / f"ch_{req.chapter:02d}.md"
    if not ch_path.exists():
        raise HTTPException(status_code=404, detail=f"Chapter {req.chapter} not found")

    text = ch_path.read_text(encoding="utf-8")
    orig_words = len(text.split())
    applied = 0
    failed = 0

    for q in req.quotes:
        q_clean = q.strip()
        if not q_clean:
            continue
        if q_clean in text:
            text = text.replace(q_clean, "")
            applied += 1
        else:
            norm_q = re.sub(r"\s+", " ", q_clean)
            tokens = [re.escape(t) for t in norm_q.split(" ") if t]
            pattern = r"\s+".join(tokens)
            m = re.search(pattern, text)
            if m:
                text = text[:m.start()] + text[m.end():]
                applied += 1
            else:
                failed += 1

    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    ch_path.write_text(text, encoding="utf-8")
    new_words = len(text.split())

    return {
        "status": "success",
        "chapter": req.chapter,
        "applied_cuts": applied,
        "failed_cuts": failed,
        "words_removed": max(0, orig_words - new_words),
        "remaining_words": new_words,
    }


@app.get("/api/editorial/briefs")
def api_get_briefs():
    """List all available revision briefs."""
    briefs_dir = PROJECT_DIR / "briefs"
    briefs_dir.mkdir(exist_ok=True, parents=True)
    briefs_list = []

    for b_file in sorted(briefs_dir.glob("ch*_brief.md")):
        try:
            m = re.search(r"ch_?(\d+)_brief\.md", b_file.name)
            ch_num = int(m.group(1)) if m else 0
            content = b_file.read_text(encoding="utf-8")
            briefs_list.append({
                "chapter": ch_num,
                "filename": b_file.name,
                "content": content,
                "modified": b_file.stat().st_mtime,
            })
        except Exception:
            pass

    return {"briefs": briefs_list, "total": len(briefs_list)}


@app.get("/api/editorial/briefs/{ch_num}")
def api_get_brief_single(ch_num: int):
    """Get single revision brief."""
    briefs_dir = PROJECT_DIR / "briefs"
    for pattern in (f"ch_{ch_num:02d}_brief.md", f"ch{ch_num:02d}_brief.md", f"ch_{ch_num}_brief.md"):
        p = briefs_dir / pattern
        if p.exists():
            return {
                "chapter": ch_num,
                "filename": p.name,
                "content": p.read_text(encoding="utf-8"),
            }
    raise HTTPException(status_code=404, detail=f"No brief found for Chapter {ch_num}")


class SaveBriefRequest(BaseModel):
    content: str

@app.post("/api/editorial/briefs/{ch_num}")
def api_save_brief_single(ch_num: int, req: SaveBriefRequest):
    """Save/update a revision brief."""
    briefs_dir = PROJECT_DIR / "briefs"
    briefs_dir.mkdir(exist_ok=True, parents=True)
    target = briefs_dir / f"ch_{ch_num:02d}_brief.md"
    target.write_text(req.content, encoding="utf-8")
    return {"status": "saved", "chapter": ch_num, "filename": target.name}


# ============================================================================
# Foundation Voice Fingerprint Endpoints
# ============================================================================

@app.get("/api/foundation/voice_metrics")
def api_get_voice_metrics():
    """Get calculated voice metrics."""
    vf_path = PROJECT_DIR / "edit_logs" / "voice_fingerprint.json"
    if not vf_path.exists():
        try:
            import subprocess
            subprocess.run([sys.executable, str(PROJECT_DIR / "voice_fingerprint.py")], check=False)
        except Exception:
            pass

    if vf_path.exists():
        try:
            return json.loads(vf_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"chapters": {}, "novel_average": {}, "outliers": {}}


class VoiceFingerprintCustomRequest(BaseModel):
    sample_text: str

@app.post("/api/foundation/voice_fingerprint_custom")
def api_post_voice_fingerprint_custom(req: VoiceFingerprintCustomRequest):
    """Analyze custom input sample prose and return quantitative metrics."""
    from voice_fingerprint import analyze_prose
    metrics = analyze_prose(req.sample_text, "custom_sample")
    return {"metrics": metrics}


# ============================================================================
# Analytics & Convergence Endpoints
# ============================================================================

@app.get("/api/analytics")
def api_get_analytics():
    """Compute and aggregate novel convergence, ELO, chapter scores, and word count trajectory."""
    # 1. Parse results.tsv
    tsv_path = PROJECT_DIR / "results.tsv"
    history = []
    if tsv_path.exists():
        lines = tsv_path.read_text(encoding="utf-8").strip().split("\n")
        if len(lines) > 1:
            header = [h.strip() for h in lines[0].split("\t")]
            for l in lines[1:]:
                parts = [p.strip() for p in l.split("\t")]
                if len(parts) == len(header):
                    row = dict(zip(header, parts))
                    try:
                        row["score"] = float(row["score"]) if row["score"] != "-" else None
                    except Exception:
                        row["score"] = None
                    try:
                        row["word_count"] = int(row["word_count"]) if row["word_count"] != "-" else 0
                    except Exception:
                        row["word_count"] = 0
                    history.append(row)

    # 2. Per-chapter matrix
    chapters_dir = PROJECT_DIR / "chapters"
    edit_logs_dir = PROJECT_DIR / "edit_logs"
    eval_logs_dir = PROJECT_DIR / "eval_logs"
    ch_matrix = []

    # Get tournament ELO lookup
    elo_lookup = {}
    tourn_path = edit_logs_dir / "compare_chapters.json"
    if tourn_path.exists():
        try:
            t_data = json.loads(tourn_path.read_text(encoding="utf-8"))
            for lb in t_data.get("leaderboard", []):
                elo_lookup[lb.get("chapter")] = lb.get("elo")
        except Exception:
            pass

    total_words = 0
    total_fat_words = 0
    scores_list = []

    for ch_num in range(1, 25):
        ch_file = chapters_dir / f"ch_{ch_num:02d}.md"
        if not ch_file.exists():
            continue

        text = ch_file.read_text(encoding="utf-8")
        words = len(text.split())
        total_words += words
        first_line = text.split("\n")[0].strip()
        clean_title = re.sub(r'^[#\s\*]+|[#\s\*]+$', '', first_line).strip() or f"Chapter {ch_num}"

        # Cuts
        cuts_file = edit_logs_dir / f"ch{ch_num:02d}_cuts.json"
        fat_pct = 0
        cut_words = 0
        if cuts_file.exists():
            try:
                c_data = json.loads(cuts_file.read_text(encoding="utf-8"))
                fat_pct = c_data.get("overall_fat_percentage", 0)
                cut_words = c_data.get("total_cuttable_words", 0)
                total_fat_words += cut_words
            except Exception:
                pass

        # Eval Score
        score = None
        eval_file = eval_logs_dir / f"eval_ch{ch_num:02d}.json"
        if not eval_file.exists():
            eval_file = eval_logs_dir / f"eval_ch{ch_num}.json"
        if eval_file.exists():
            try:
                e_data = json.loads(eval_file.read_text(encoding="utf-8"))
                score = e_data.get("score")
                if score is not None:
                    scores_list.append(score)
            except Exception:
                pass

        ch_matrix.append({
            "chapter": ch_num,
            "title": clean_title,
            "word_count": words,
            "reading_time_min": max(1, round(words / 225)),
            "score": score,
            "fat_percentage": fat_pct,
            "cuttable_words": cut_words,
            "elo": round(elo_lookup.get(ch_num, 1500)),
        })

    # Summary
    avg_score = round(statistics.mean(scores_list), 2) if scores_list else 0.0
    overall_fat_pct = round((total_fat_words / total_words) * 100, 1) if total_words > 0 else 0.0

    return {
        "history": history,
        "chapters": ch_matrix,
        "total_words": total_words,
        "total_chapters": len(ch_matrix),
        "average_chapter_score": avg_score,
        "overall_fat_percentage": overall_fat_pct,
    }


# ============================================================================
# Engine Settings Endpoints
# ============================================================================

@app.get("/api/settings")
def api_get_settings():
    """Get active engine model and temperature configuration."""
    from language_utils import detect_project_language
    settings_file = PROJECT_DIR / "settings.json"
    if settings_file.exists():
        try:
            stored = json.loads(settings_file.read_text(encoding="utf-8"))
            for k, v in stored.items():
                if k not in os.environ:
                    os.environ[k] = str(v)
        except Exception:
            pass

    return {
        "writer_model": os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.7-flash"),
        "judge_model": os.environ.get("AUTONOVEL_JUDGE_MODEL", "gemini-3.7-flash"),
        "review_model": os.environ.get("AUTONOVEL_REVIEW_MODEL", "gemini-3.7-flash"),
        "temperature": float(os.environ.get("AUTONOVEL_TEMPERATURE", "0.75")),
        "target_words": int(os.environ.get("AUTONOVEL_TARGET_WORDS", "3500")),
        "language": os.environ.get("AUTONOVEL_LANGUAGE", detect_project_language()),
        "novel_type": os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel"),
        "has_gemini_key": bool(os.environ.get("GEMINI_API_KEY")),
        "has_anthropic_key": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }




class SettingsUpdateRequest(BaseModel):
    writer_model: Optional[str] = None
    judge_model: Optional[str] = None
    temperature: Optional[float] = None
    target_words: Optional[int] = None
    language: Optional[str] = None
    novel_type: Optional[str] = None

@app.post("/api/settings")
def api_update_settings(req: SettingsUpdateRequest):
    """Update settings in .env and runtime environment."""
    env_file = PROJECT_DIR / ".env"
    env_content = env_file.read_text(encoding="utf-8") if env_file.exists() else ""
    lines = env_content.splitlines()
    env_map = {}

    for l in lines:
        if "=" in l and not l.strip().startswith("#"):
            k, v = l.split("=", 1)
            env_map[k.strip()] = v.strip()

    if req.writer_model is not None:
        env_map["AUTONOVEL_WRITER_MODEL"] = req.writer_model
        os.environ["AUTONOVEL_WRITER_MODEL"] = req.writer_model
    if req.judge_model is not None:
        env_map["AUTONOVEL_JUDGE_MODEL"] = req.judge_model
        os.environ["AUTONOVEL_JUDGE_MODEL"] = req.judge_model
    if req.temperature is not None:
        env_map["AUTONOVEL_TEMPERATURE"] = str(req.temperature)
        os.environ["AUTONOVEL_TEMPERATURE"] = str(req.temperature)
    if req.target_words is not None:
        env_map["AUTONOVEL_TARGET_WORDS"] = str(req.target_words)
        os.environ["AUTONOVEL_TARGET_WORDS"] = str(req.target_words)
    if req.language is not None:
        env_map["AUTONOVEL_LANGUAGE"] = req.language
        os.environ["AUTONOVEL_LANGUAGE"] = req.language
    if req.novel_type is not None:
        env_map["AUTONOVEL_NOVEL_TYPE"] = req.novel_type
        os.environ["AUTONOVEL_NOVEL_TYPE"] = req.novel_type

    new_lines = []
    for k, v in env_map.items():
        new_lines.append(f"{k}={v}")

    try:
        env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception as e:
        print(f"Note: .env update skipped ({e}), updating settings.json and os.environ")
        # Save to settings.json
        settings_file = PROJECT_DIR / "settings.json"
        settings_file.write_text(json.dumps(env_map, indent=2), encoding="utf-8")

    return {"status": "updated", "settings": api_get_settings()}




# ============================================================================
# Export & Production Endpoints
# ============================================================================

@app.get("/api/export/manuscript")
def api_export_manuscript():
    """Concatenate all drafted chapters into a complete manuscript."""
    chapters_dir = PROJECT_DIR / "chapters"
    files = sorted(chapters_dir.glob("ch_*.md"))
    
    # Title
    title = "Manuscript"
    outline_path = PROJECT_DIR / "outline.md"
    if outline_path.exists():
        first_line = outline_path.read_text(encoding="utf-8").split("\n")[0]
        title = first_line.lstrip("# ").strip() or title
    
    parts = []
    total_words = 0
    chapters_list = []
    
    for f in files:
        text = f.read_text(encoding="utf-8")
        wc = len(text.split())
        total_words += wc
        parts.append(text)
        first_line = text.split("\n")[0].lstrip("# ").strip() if text else f.name
        chapters_list.append({
            "filename": f.name,
            "title": first_line,
            "word_count": wc,
        })
    
    full_content = "\n\n---\n\n".join(parts)
    
    # Check if LaTeX typeset output exists
    tex_path = PROJECT_DIR / "typeset" / "chapters_content.tex"
    has_typeset = tex_path.exists() and tex_path.stat().st_size > 50

    return {
        "title": title,
        "total_words": total_words,
        "chapters_count": len(files),
        "chapters": chapters_list,
        "full_text": full_content,
        "has_typeset": has_typeset,
    }


@app.get("/api/export/art")
def api_export_art():
    """Get visual style and generated art direction concepts."""
    art_dir = PROJECT_DIR / "art"
    style = {}
    directions = {}
    picks = {}

    style_file = art_dir / "visual_style.json"
    if style_file.exists():
        try: style = json.loads(style_file.read_text(encoding="utf-8"))
        except Exception: pass

    picks_file = art_dir / "picks.json"
    if picks_file.exists():
        try: picks = json.loads(picks_file.read_text(encoding="utf-8"))
        except Exception: pass

    for d_file in art_dir.glob("directions_*.json"):
        art_type = d_file.stem.replace("directions_", "")
        try:
            directions[art_type] = json.loads(d_file.read_text(encoding="utf-8"))
        except Exception: pass

    return {
        "visual_style": style,
        "picks": picks,
        "directions": directions,
    }


@app.get("/api/export/audiobook")
def api_export_audiobook():
    """Get parsed audiobook scripts."""
    scripts_dir = PROJECT_DIR / "audiobook" / "scripts"
    scripts = []

    if scripts_dir.exists():
        for s_file in sorted(scripts_dir.glob("ch*_script.json")):
            try:
                scripts.append({
                    "filename": s_file.name,
                    "data": json.loads(s_file.read_text(encoding="utf-8"))
                })
            except Exception: pass

    return {
        "scripts": scripts,
        "total_chapters": len(scripts),
    }


@app.get("/api/export/manual_pdf")
def api_download_manual_pdf():
    """Download compiled Autonovel Studio User Manual PDF."""
    pdf_path = PROJECT_DIR / "Autonovel_Studio_User_Manual.pdf"
    if not pdf_path.exists():
        try:
            import subprocess
            subprocess.run([sys.executable, str(PROJECT_DIR / "generate_manual_pdf.py")], check=False)
        except Exception:
            pass
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Manual PDF not found")
    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename="Autonovel_Studio_User_Manual.pdf"
    )




# ============================================================================
# Action Trigger & Execution Engine
# ============================================================================

class RunActionRequest(BaseModel):
    action: str
    params: Dict[str, Any] = {}


@dataclass(frozen=True)
class ActionCommand:
    argv: tuple[str, ...]
    display: str


ActionBuilder = Callable[[Mapping[str, Any]], ActionCommand]


def _command(argv: Sequence[str], display: str | None = None) -> ActionCommand:
    command_argv = tuple(argv)
    return ActionCommand(command_argv, display or " ".join(command_argv))


def _positive_int(value: Any, name: str, default: int | None = None) -> int:
    if value is None and default is not None:
        return default
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{name} must be a positive integer")
    return value


def _strict_bool(value: Any, name: str, default: bool = False) -> bool:
    if value is None:
        return default
    if not isinstance(value, bool):
        raise ValueError(f"{name} must be a boolean")
    return value


def _chapter_or_all(value: Any, name: str = "chapter") -> str:
    if value == "all":
        return "all"
    return str(_positive_int(value, name))


def _simple_action(script: str, *args: str) -> ActionBuilder:
    def build(_params: Mapping[str, Any]) -> ActionCommand:
        return _command((script, *args))

    return build


def _build_seed(params: Mapping[str, Any]) -> ActionCommand:
    riff = params.get("riff")
    if riff:
        if not isinstance(riff, str):
            raise ValueError("riff must be a string")
        return _command(
            ("seed.py", "--riff", riff),
            f'seed.py --riff "{riff}"',
        )
    count = _positive_int(params.get("count"), "count", default=10)
    return _command(("seed.py", "--count", str(count)))


def _build_chapter_action(script: str, default: int = 1) -> ActionBuilder:
    def build(params: Mapping[str, Any]) -> ActionCommand:
        chapter = _positive_int(params.get("chapter"), "chapter", default=default)
        return _command((script, str(chapter)))

    return build


def _build_evaluate_chapter(params: Mapping[str, Any]) -> ActionCommand:
    chapter = _positive_int(params.get("chapter"), "chapter", default=1)
    return _command(("evaluate.py", f"--chapter={chapter}"))


def _build_all_or_chapter_action(script: str) -> ActionBuilder:
    def build(params: Mapping[str, Any]) -> ActionCommand:
        chapter = _chapter_or_all(params.get("chapter", "all"))
        return _command((script, chapter))

    return build


def _build_pipeline(params: Mapping[str, Any]) -> ActionCommand:
    argv = ["run_pipeline.py"]
    if _strict_bool(params.get("from_scratch"), "from_scratch"):
        argv.append("--from-scratch")

    phase = params.get("phase")
    if phase is not None:
        if phase not in {"foundation", "drafting", "revision", "export"}:
            raise ValueError("phase must be foundation, drafting, revision, or export")
        argv.extend(("--phase", phase))

    max_cycles = params.get("max_cycles", 6)
    if max_cycles:
        argv.extend(("--max-cycles", str(_positive_int(max_cycles, "max_cycles"))))
    return _command(argv)


def _build_reset(params: Mapping[str, Any]) -> ActionCommand:
    argv = ["reset_project.py"]
    if _strict_bool(params.get("keep_seed"), "keep_seed"):
        argv.append("--keep-seed")
    return _command(argv)


def _build_art_directions(params: Mapping[str, Any]) -> ActionCommand:
    art_type = params.get("type", "cover")
    if art_type not in {"cover", "ornament", "map", "scene-break"}:
        raise ValueError("type must be cover, ornament, map, or scene-break")
    return _command(("gen_art_directions.py", art_type))


def _build_art(params: Mapping[str, Any]) -> ActionCommand:
    subcommand = params.get("subcommand", "all")
    if not isinstance(subcommand, str) or not subcommand:
        raise ValueError("subcommand must be a non-empty string")

    parts = subcommand.split()
    art_types = {"cover", "ornament", "map", "scene-break"}
    if len(parts) == 1 and parts[0] in {
        "style",
        "ornaments-all",
        "scene-break",
        "all",
    }:
        argv = parts
    elif parts[:1] == ["curate"] and len(parts) in {2, 3, 4}:
        if parts[1] not in art_types:
            raise ValueError("gen_art subcommand has an invalid art type")
        if len(parts) == 2:
            argv = parts
        elif len(parts) == 3 and parts[2].startswith("--n="):
            count = parts[2].removeprefix("--n=")
            if not count.isdigit() or int(count) < 1:
                raise ValueError("gen_art subcommand has an invalid variant count")
            argv = parts
        elif len(parts) == 4 and parts[2] == "--n":
            if not parts[3].isdigit() or int(parts[3]) < 1:
                raise ValueError("gen_art subcommand has an invalid variant count")
            argv = parts
        else:
            raise ValueError("gen_art subcommand is not supported")
    elif parts[:1] == ["pick"] and len(parts) == 3:
        if parts[1] not in art_types:
            raise ValueError("gen_art subcommand has an invalid art type")
        if not parts[2].isdigit() or int(parts[2]) < 1:
            raise ValueError("gen_art subcommand has an invalid variant number")
        argv = parts
    elif parts[:1] == ["vectorize"] and len(parts) in {1, 2}:
        if len(parts) == 2 and (
            ".." in parts[1]
            or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", parts[1]) is None
        ):
            raise ValueError("gen_art subcommand has an invalid vectorize target")
        argv = parts
    else:
        raise ValueError("gen_art subcommand is not supported")

    return _command(("gen_art.py", *argv), f"gen_art.py {subcommand}")


def _build_brief(params: Mapping[str, Any]) -> ActionCommand:
    chapter = params.get("chapter")
    if chapter:
        chapter = _positive_int(chapter, "chapter")
        return _command(("gen_brief.py", "--panel", str(chapter)))
    return _command(("gen_brief.py", "--auto"))


def _build_optional_chapter_action(script: str) -> ActionBuilder:
    def build(params: Mapping[str, Any]) -> ActionCommand:
        chapter = params.get("chapter")
        if chapter:
            chapter = _positive_int(chapter, "chapter")
            return _command((script, str(chapter)))
        return _command((script,))

    return build


def _build_rewrite_chapter_beats(params: Mapping[str, Any]) -> ActionCommand:
    chapter = _positive_int(params.get("chapter"), "chapter")
    if chapter > 24:
        raise ValueError("chapter must be between 1 and 24")
    mode = params.get("mode")
    if mode not in {"fresh", "revise"}:
        raise ValueError("mode must be fresh or revise")
    return _command(
        ("rewrite_chapter_beats.py", str(chapter), f"--mode={mode}")
    )


def _build_run_drafts(params: Mapping[str, Any]) -> ActionCommand:
    draft_all = _strict_bool(params.get("all"), "all")
    overwrite = _strict_bool(params.get("overwrite"), "overwrite")
    start = params.get("start")
    end = params.get("end")

    if draft_all:
        if start is not None or end is not None:
            raise ValueError("all cannot be combined with start or end")
        argv = ["run_drafts.py", "--all"]
    else:
        if start is None or end is None:
            raise ValueError("start and end are required when all is false")
        start = _positive_int(start, "start")
        end = _positive_int(end, "end")
        if start > 24 or end > 24:
            raise ValueError("start and end must be between 1 and 24")
        if start > end:
            raise ValueError("start must not be greater than end")
        argv = ["run_drafts.py", f"--start={start}", f"--end={end}"]

    if overwrite:
        argv.append("--overwrite")
    return _command(argv)


ACTION_REGISTRY: dict[str, ActionBuilder] = {
    "seed": _build_seed,
    "gen_world": _simple_action("gen_world.py"),
    "gen_characters": _simple_action("gen_characters.py"),
    "gen_outline": _simple_action("gen_outline.py"),
    "gen_outline_part2": _simple_action("gen_outline_part2.py"),
    "gen_canon": _simple_action("gen_canon.py"),
    "voice_fingerprint": _simple_action("voice_fingerprint.py"),
    "draft_chapter": _build_chapter_action("draft_chapter.py"),
    "evaluate_foundation": _simple_action("evaluate.py", "--phase=foundation"),
    "evaluate_chapter": _build_evaluate_chapter,
    "evaluate_full": _simple_action("evaluate.py", "--full"),
    "adversarial_edit": _build_all_or_chapter_action("adversarial_edit.py"),
    "compare_chapters": _simple_action("compare_chapters.py"),
    "reader_panel": _simple_action("reader_panel.py"),
    "review": _simple_action("review.py"),
    "run_pipeline": _build_pipeline,
    "reset": _build_reset,
    "build_tex": _simple_action("typeset/build_tex.py"),
    "gen_art_style": _simple_action("gen_art.py", "style"),
    "gen_art_directions": _build_art_directions,
    "gen_art": _build_art,
    "apply_cuts": _build_all_or_chapter_action("apply_cuts.py"),
    "gen_brief": _build_brief,
    "gen_revision": _build_chapter_action("gen_revision.py"),
    "gen_audiobook_script": _build_optional_chapter_action(
        "gen_audiobook_script.py"
    ),
    "rewrite_chapter_beats": _build_rewrite_chapter_beats,
    "run_drafts": _build_run_drafts,
}


async def run_command_stream(argv: Sequence[str], display_cmd: str):
    """Execute an allowlisted script argv and stream output over WebSocket."""
    job_state.is_running = True
    job_state.current_cmd = display_cmd
    job_state.logs.clear()
    
    await manager.broadcast({
        "type": "job_start",
        "cmd": display_cmd,
    })

    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONIOENCODING"] = "utf-8"
        env["AUTONOVEL_PROJECT_DIR"] = str(PROJECT_DIR)
        
        script_dir = Path(__file__).resolve().parent
        absolute_script = script_dir / argv[0]

        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-u",
            str(absolute_script),
            *argv[1:],
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(PROJECT_DIR),
            env=env,
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
            "cmd": display_cmd,
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
            "cmd": display_cmd,
        })
    finally:
        job_state.is_running = False
        job_state.current_process = None


@app.post("/api/actions/run")
async def api_run_action(req: RunActionRequest, background_tasks: BackgroundTasks):
    """Trigger a tool or pipeline action."""
    if job_state.is_running:
        raise HTTPException(status_code=400, detail="A job is already running")

    builder = ACTION_REGISTRY.get(req.action)
    if builder is None:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
    try:
        command = builder(req.params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Reserve the single process slot before the background task starts so two
    # concurrent requests cannot both pass the availability check.
    job_state.is_running = True
    try:
        background_tasks.add_task(run_command_stream, command.argv, command.display)
    except Exception:
        job_state.is_running = False
        raise
    return {"status": "started", "cmd": command.display}


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
# Project Management
# ============================================================================

import shutil


PROJECT_ID_PATTERN = re.compile(r"[\w\u0600-\u06FF-]+")
PROJECT_RESERVED_IDS = frozenset({"root", ".", ".."})


def get_projects_dir() -> Path:
    projects_dir = (SCRIPT_DIR / "projects").resolve()
    projects_dir.mkdir(exist_ok=True)
    return projects_dir


def resolve_project_path(project_id: str, *, require_exists: bool = True) -> Path:
    """Resolve a project ID to a non-symlinked direct child of projects/."""
    if (
        not project_id
        or project_id in PROJECT_RESERVED_IDS
        or PROJECT_ID_PATTERN.fullmatch(project_id) is None
    ):
        raise HTTPException(400, "Invalid project ID")

    projects_dir = get_projects_dir()
    candidate = projects_dir / project_id
    if candidate.parent != projects_dir or candidate.is_symlink():
        raise HTTPException(400, "Project path must be an exact directory under projects")

    resolved = candidate.resolve(strict=False)
    if resolved != candidate or resolved.parent != projects_dir:
        raise HTTPException(400, "Project path must be an exact directory under projects")

    if require_exists and (not candidate.exists() or not candidate.is_dir()):
        raise HTTPException(404, "Project not found")
    return candidate


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
    projects_dir = get_projects_dir()
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
        if p.is_symlink() or not p.is_dir():
            continue
        try:
            project_dir = resolve_project_path(p.name)
        except HTTPException:
            continue
        if project_dir.is_dir():
            p_meta = get_project_metadata(project_dir)
            projects.append({
                "id": project_dir.name,
                "name": project_dir.name,
                "path": str(project_dir),
                "is_active": PROJECT_DIR.resolve() == project_dir,
                **p_meta
            })
    return {"projects": projects, "active_project": str(PROJECT_DIR)}


class CreateProjectRequest(BaseModel):
    name: str

@app.post("/api/projects")
def api_create_project(req: CreateProjectRequest):
    raw_name = req.name.strip()
    if (
        not raw_name
        or raw_name in {".", ".."}
        or "/" in raw_name
        or "\\" in raw_name
        or "%" in raw_name
    ):
        raise HTTPException(400, "Invalid project name")

    safe_name = re.sub(r'[^\w؀-ۿ\-]', '_', raw_name)
    if not safe_name:
        raise HTTPException(400, "Invalid project name")

    p_dir = resolve_project_path(safe_name, require_exists=False)
    if p_dir.exists() or p_dir.is_symlink():
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
    p_dir = resolve_project_path(project_id)
    if PROJECT_DIR.resolve() == p_dir:
        raise HTTPException(409, "Cannot delete active project")

    shutil.rmtree(p_dir)
    return {"status": "deleted", "id": project_id}

class SetActiveProjectRequest(BaseModel):
    id: str

@app.post("/api/projects/set_active")
def api_set_active_project(req: SetActiveProjectRequest):
    global PROJECT_DIR
    global ORCHESTRATOR_LOG_PATH
    
    if req.id == "root":
        new_dir = SCRIPT_DIR.resolve()
    else:
        new_dir = resolve_project_path(req.id)
            
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

# ============================================================================
# Static Files & UI Serving
# ============================================================================

ui_dist = SCRIPT_DIR / "ui" / "dist"
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
