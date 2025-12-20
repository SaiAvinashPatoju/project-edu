#!/bin/bash

# ========================================
#   Lecture to Slides - Development Mode
# ========================================

echo ""
echo "============================================="
echo "  Lecture to Slides - Development Mode"
echo "============================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if setup is complete
if [ ! -d "backend/venv" ]; then
    echo "[ERROR] Backend virtual environment not found!"
    echo "Please run ./setup-dev.sh first."
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "[ERROR] Frontend dependencies not installed!"
    echo "Please run ./setup-dev.sh first."
    exit 1
fi

# Environment variables for backend
export SECRET_KEY="super_secret_jwt_key_for_development_change_in_production_12345"
export DATABASE_URL="sqlite:///./lectures.db"
export ACCESS_TOKEN_EXPIRE_MINUTES=30
export TEMP_FILE_DIR="./temp_uploads"
export MAX_FILE_SIZE_MB=500
export MAX_DURATION_MINUTES=120
export BACKGROUND_TASK_TIMEOUT=3600
export CLEANUP_INTERVAL_HOURS=24

# Local AI Models (Offline-first)
export MOONSHINE_MODEL="UsefulSensors/moonshine-base"
export QWEN_MODEL_PATH="../models/qwen2.5-3b.gguf/qwen2.5-3b-instruct-q4_k_m.gguf"
export USE_MOCK_TRANSCRIPTION="false"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "[1/2] Starting Backend Server..."
echo "     URL: http://localhost:8000"
echo "     API Docs: http://localhost:8000/docs"

cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

echo "[2/2] Starting Frontend Server..."
echo "     URL: http://localhost:3000"

cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================="
echo "  Servers Started Successfully!"
echo "============================================="
echo ""
echo " Backend:   http://localhost:8000"
echo " API Docs:  http://localhost:8000/docs"
echo " Frontend:  http://localhost:3000"
echo ""
echo " Press Ctrl+C to stop all servers."
echo ""

# Wait for processes
wait
