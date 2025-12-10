@echo off
REM ========================================
REM   Lecture to Slides - Development Setup
REM ========================================
echo.
echo ===========================================
echo   Lecture to Slides - Development Setup
echo ===========================================
echo.

REM Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found.

REM Check Node.js
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.

REM Setup Backend
echo.
echo [3/6] Setting up Backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv\Scripts\activate.bat" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)
echo [OK] Virtual environment ready.

REM Activate venv and install dependencies
echo [4/6] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.

REM Setup backend .env if it doesn't exist
if not exist ".env" (
    echo Creating backend .env file from template...
    copy .env.example .env >nul
    echo [NOTICE] Created backend\.env - Please configure your settings!
) else (
    echo [OK] Backend .env file exists.
)

cd ..

REM Setup Frontend
echo.
echo [5/6] Setting up Frontend...
cd frontend

REM Install npm dependencies
echo Installing frontend dependencies...
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.

REM Create frontend .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating frontend .env.local file...
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
    echo [OK] Created frontend\.env.local
) else (
    echo [OK] Frontend .env.local file exists.
)

cd ..

REM Final summary
echo.
echo ===========================================
echo   Setup Complete!
echo ===========================================
echo.
echo [OK] Backend:  Python virtual environment + dependencies
echo [OK] Frontend: Node.js dependencies
echo.
echo Configuration files:
echo      - backend\.env  (configure API keys)
echo      - frontend\.env.local
echo.
echo [6/6] To start development, run:
echo       start-dev.bat
echo.
pause
