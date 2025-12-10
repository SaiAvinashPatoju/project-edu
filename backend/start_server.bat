@echo off
REM ========================================
REM   Backend Server Startup Script
REM ========================================
echo.
echo Starting Backend Server...
echo.

REM Set environment variables
set SECRET_KEY=super_secret_jwt_key_for_development_change_in_production_12345
set GOOGLE_API_KEY=AIzaSyCIk5gH-tDX2ygGeNlCAykpVGDtzrngCRY
set DATABASE_URL=sqlite:///./lectures.db
set ACCESS_TOKEN_EXPIRE_MINUTES=30
set WHISPER_MODEL_SIZE=base
set TEMP_FILE_DIR=./temp_uploads
set MAX_FILE_SIZE_MB=500
set MAX_DURATION_MINUTES=120
set BACKGROUND_TASK_TIMEOUT=3600
set CLEANUP_INTERVAL_HOURS=24
REM Enable mock transcription if faster-whisper is not installed
set USE_MOCK_TRANSCRIPTION=true

REM Create temp_uploads directory if not exists
if not exist "temp_uploads" mkdir temp_uploads

REM Check if virtual environment exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [WARNING] Virtual environment not found. Using system Python.
)

echo.
echo Server starting on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo Press Ctrl+C to stop the server.
echo.

python main.py