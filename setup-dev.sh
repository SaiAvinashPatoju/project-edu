#!/bin/bash

# ========================================
#   Lecture to Slides - Development Setup
# ========================================

echo ""
echo "==========================================="
echo "  Lecture to Slides - Development Setup"
echo "==========================================="
echo ""

# Check Python
echo "[1/6] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed."
    echo "Please install Python 3.8+ first."
    exit 1
fi
echo "[OK] Python found: $(python3 --version)"

# Check Node.js
echo "[2/6] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js 18+ first."
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Setup Backend
echo ""
echo "[3/6] Setting up Backend..."
cd backend || exit 1

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment."
        exit 1
    fi
fi
echo "[OK] Virtual environment ready."

# Activate venv and install dependencies
echo "[4/6] Installing backend dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install backend dependencies."
    exit 1
fi
echo "[OK] Backend dependencies installed."

# Setup backend .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating backend .env file from template..."
    cp .env.example .env
    echo "[NOTICE] Created backend/.env - Please configure your settings!"
else
    echo "[OK] Backend .env file exists."
fi

cd ..

# Setup Frontend
echo ""
echo "[5/6] Setting up Frontend..."
cd frontend || exit 1

# Install npm dependencies
echo "Installing frontend dependencies..."
npm install --silent
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install frontend dependencies."
    exit 1
fi
echo "[OK] Frontend dependencies installed."

# Create frontend .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating frontend .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    echo "[OK] Created frontend/.env.local"
else
    echo "[OK] Frontend .env.local file exists."
fi

cd ..

# Final summary
echo ""
echo "==========================================="
echo "  Setup Complete!"
echo "==========================================="
echo ""
echo "[OK] Backend:  Python virtual environment + dependencies"
echo "[OK] Frontend: Node.js dependencies"
echo ""
echo "Configuration files:"
echo "     - backend/.env  (configure API keys)"
echo "     - frontend/.env.local"
echo ""
echo "[6/6] To start development, run:"
echo "      ./start-dev.sh"
echo ""
