#!/bin/bash
# start_studio.sh -- One-command launcher for Autonovel Studio

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================="
echo " Starting Autonovel Studio..."
echo " Backend: http://127.0.0.1:8000"
echo " Frontend Dev: http://localhost:5173"
echo "=========================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Copying .env.example to .env..."
    cp .env.example .env
    echo "Please edit .env to set your GEMINI_API_KEY."
fi

# Run backend
python3 server.py
