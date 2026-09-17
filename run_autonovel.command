#!/bin/bash
cd "$(dirname "$0")"

echo "======================================"
echo "    Starting Autonovel Studio...      "
echo "======================================"

# Add common local bin paths just in case (for node, npm, uv)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# 1. Build the frontend if it doesn't exist
if [ ! -d "ui/dist" ]; then
    echo "First time setup: Building Frontend UI..."
    cd ui
    npm install
    npm run build
    cd ..
fi

# 2. Run the server on port 8080 (to avoid clashing with your other apps)
echo "Starting backend server on port 8080..."
export PORT=8080

# 3. Open the browser automatically
sleep 2 && open http://localhost:8080 &

# 4. Start the server (force using the local .venv to prevent Conda clashes)
if [ -f ".venv/bin/python" ]; then
    .venv/bin/python server.py
elif command -v uv &> /dev/null; then
    uv run python server.py
else
    python3 server.py
fi
