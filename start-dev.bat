@echo off
REM ========================================
REM   Lecture to Slides - Development Mode
REM ========================================
echo.
echo =============================================
echo   Lecture to Slides - Development Mode
echo =============================================
echo.

REM Check if setup is complete
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Backend virtual environment not found!
    echo Please run setup-dev.bat first.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [ERROR] Frontend dependencies not installed!
    echo Please run setup-dev.bat first.
    pause
    exit /b 1
)

REM Environment variables for backend
set SECRET_KEY=super_secret_jwt_key_for_development_change_in_production_12345
set DATABASE_URL=sqlite:///./lectures.db
set ACCESS_TOKEN_EXPIRE_MINUTES=30
set TEMP_FILE_DIR=./temp_uploads
set MAX_FILE_SIZE_MB=500
set MAX_DURATION_MINUTES=120
set BACKGROUND_TASK_TIMEOUT=3600
set CLEANUP_INTERVAL_HOURS=24

REM Local AI Models (Offline-first)
set MOONSHINE_MODEL=UsefulSensors/moonshine-base
set QWEN_MODEL_PATH=../models/qwen2.5-3b.gguf/qwen2.5-3b-instruct-q4_k_m.gguf
set USE_MOCK_TRANSCRIPTION=false

echo [1/2] Starting Backend Server...
echo      URL: http://localhost:8000
echo      API Docs: http://localhost:8000/docs
start "Backend Server" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python main.py"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Server...
echo      URL: http://localhost:3000
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =============================================
echo   Servers Started Successfully!
echo =============================================
echo.
echo  Backend:   http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo  Frontend:  http://localhost:3000
echo.
echo  Both servers are running in separate windows.
echo  Close those windows to stop the servers.
echo.
echo Press any key to close this window...
pause > nul