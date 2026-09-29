#!/usr/bin/env python3
"""Launch the installed Autonovel Studio with durable per-user projects."""

import argparse
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

VERSION = "0.1.0"


def default_data_dir() -> Path:
    override = os.environ.get("AUTONOVEL_DATA_DIR")
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Autonovel"
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "autonovel"


def open_when_ready(url: str) -> None:
    for _ in range(60):
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    webbrowser.open(url)
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.5)


def main() -> None:
    parser = argparse.ArgumentParser(description="Launch Autonovel Studio")
    parser.add_argument("--version", action="version", version=f"Autonovel Studio {VERSION}")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser tab")
    parser.add_argument("--port", type=int, default=8080, help="Local port (default: 8080)")
    parser.add_argument("--data-dir", type=Path, help="Directory for projects and settings")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    with socket.socket() as check:
        if check.connect_ex(("127.0.0.1", args.port)) == 0:
            parser.error(f"port {args.port} is already in use; choose another with --port")

    data_dir = (args.data_dir or default_data_dir()).expanduser().resolve()
    projects_dir = data_dir / "projects"
    starter_dir = projects_dir / "Starter"
    starter_dir.mkdir(parents=True, exist_ok=True)
    (starter_dir / "seed.txt").touch(exist_ok=True)
    gitignore = starter_dir / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(".env\n", encoding="utf-8")
    if not (starter_dir / ".git").exists():
        subprocess.run(["git", "init", "-q", str(starter_dir)], check=False)

    active_dir = starter_dir
    active_file = data_dir / "active_project"
    if active_file.exists():
        active_id = active_file.read_text(encoding="utf-8").strip()
        candidate = (projects_dir / active_id).resolve()
        if candidate.parent == projects_dir and candidate.is_dir():
            active_dir = candidate

    os.environ["AUTONOVEL_DATA_DIR"] = str(data_dir)
    os.environ["AUTONOVEL_PROJECTS_DIR"] = str(projects_dir)
    os.environ["AUTONOVEL_ROOT_PROJECT_DIR"] = str(starter_dir)
    os.environ["AUTONOVEL_PROJECT_DIR"] = str(active_dir)
    os.environ["AUTONOVEL_ENV_FILE"] = str(data_dir / ".env")
    os.environ["AUTONOVEL_HOST"] = "127.0.0.1"
    os.environ["PORT"] = str(args.port)
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Autonovel Studio: {url}", flush=True)
    print(f"Active book: {active_dir}", flush=True)
    if not args.no_browser:
        threading.Thread(target=open_when_ready, args=(url,), daemon=True).start()
    from server import main as run_server
    run_server()


if __name__ == "__main__":
    main()
