@echo off
REM Production Startup Script for Lecture to Slides (Windows)

echo 🚀 Starting Lecture to Slides in Production Mode

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Check if environment files exist
if not exist "backend\.env" (
    echo ❌ Backend .env file not found. Please copy backend\production.env.example to backend\.env and configure it.
    pause
    exit /b 1
)

if not exist "frontend\.env.production" (
    echo ⚠️  Frontend .env.production file not found. Using defaults.
)

REM Create necessary directories
if not exist "backend\temp_uploads" mkdir "backend\temp_uploads"
if not exist "backend\exports" mkdir "backend\exports"
if not exist "ssl" mkdir "ssl"

echo 📦 Building and starting services...

REM Build and start services
docker-compose up --build -d

echo ⏳ Waiting for services to be healthy...

REM Wait for services to be ready (simplified for Windows)
timeout /t 30 /nobreak >nul

echo 🎉 Lecture to Slides is now running!
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend API: http://localhost:8000
echo 📍 Health Check: http://localhost/health
echo.
echo 📋 To view logs: docker-compose logs -f
echo 🛑 To stop: docker-compose down
echo 🔄 To restart: docker-compose restart
echo.
pause