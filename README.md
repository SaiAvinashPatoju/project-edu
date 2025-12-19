# Project EDU - Lecture to Slides

> Transform classroom lectures into professional slide presentations using local, open-source AI models.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🎯 Overview

Project EDU is an offline-first web application that converts audio lectures into structured slide presentations. It uses **local AI models** for privacy and reliability:

- **🎤 Speech-to-Text**: [Moonshine ASR](https://github.com/usefulsensors/moonshine) (UsefulSensors)
- **📝 Content Generation**: [Qwen 2.5](https://huggingface.co/Qwen) (7B, GGUF format via llama-cpp-python)

**Key Features:**
- 🔒 **Privacy-first**: All processing happens locally - no data sent to cloud services
- 🎓 **Teacher-faithful**: Generated slides only contain what the teacher actually said
- 💻 **Works offline**: No internet required after initial model download
- 🚀 **Multiple deployment options**: Local development, Docker, Render, Hugging Face Spaces

---

## 📁 Project Structure

```
project_edu_new/
├── backend/                 # FastAPI backend with AI processing
│   ├── services/           # Core services (transcription, content generation)
│   ├── main.py            # API entrypoint
│   ├── models.py          # Database models
│   └── requirements.txt   # Python dependencies
├── frontend/               # Next.js 14 frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── package.json       # Node.js dependencies
├── spaces/                 # Hugging Face Spaces deployment
├── models/                 # Local AI model files (not in git)
│   └── qwen2.5-7b.gguf/   # Qwen model (download separately)
├── docker-compose.yml      # Production Docker setup
├── setup-dev.bat          # Windows setup script
├── setup-dev.sh           # Linux/macOS setup script
├── start-dev.bat          # Windows dev server script
└── start-dev.sh           # Linux/macOS dev server script
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Python | 3.11+ | Backend server |
| Node.js | 18+ | Frontend server |
| Git | Latest | Version control |
| ~10GB disk space | - | AI models + dependencies |

### Step 1: Clone the Repository

```bash
git clone https://github.com/SaiAvinashPatoju/project-edu.git
cd project-edu
```

### Step 2: Download AI Models

The Qwen 2.5 model must be downloaded manually:

```bash
# Create models directory
mkdir -p models/qwen2.5-7b.gguf

# Download from Hugging Face (requires huggingface-cli)
pip install huggingface_hub
huggingface-cli download Qwen/Qwen2.5-7B-Instruct-GGUF qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf --local-dir models/qwen2.5-7b.gguf
huggingface-cli download Qwen/Qwen2.5-7B-Instruct-GGUF qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf --local-dir models/qwen2.5-7b.gguf
```

> **Note**: Moonshine ASR model auto-downloads on first use (~200MB).

### Step 3: Setup & Run

#### Windows (Automated)

```batch
:: First-time setup
setup-dev.bat

:: Start development servers
start-dev.bat
```

#### Linux/macOS (Automated)

```bash
# First-time setup
chmod +x setup-dev.sh && ./setup-dev.sh

# Start development servers
chmod +x start-dev.sh && ./start-dev.sh
```

#### Manual Setup

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Linux/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start server
python main.py
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

### Step 4: Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Database
DATABASE_URL=sqlite:///./lectures.db

# Security (CHANGE THIS!)
SECRET_KEY=your_secure_random_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Local AI Models
MOONSHINE_MODEL=UsefulSensors/moonshine-base
QWEN_MODEL_PATH=../models/qwen2.5-7b.gguf

# File Storage
TEMP_FILE_DIR=./temp_uploads
MAX_FILE_SIZE_MB=500
MAX_DURATION_MINUTES=120

# Processing
BACKGROUND_TASK_TIMEOUT=3600
CLEANUP_INTERVAL_HOURS=24
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services started:
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Task queue (port 6379)
- **backend**: FastAPI server (port 8000)
- **frontend**: Next.js app (port 3000)
- **nginx**: Reverse proxy (ports 80, 443)

### Production Deployment

1. **Configure environment files:**
   ```bash
   cp backend/production.env.example backend/.env
   cp frontend/.env.production.example frontend/.env.production
   # Edit both files with production values
   ```

2. **Set up SSL certificates:**
   ```bash
   mkdir ssl
   # Copy your certificates to ssl/cert.pem and ssl/key.pem
   ```

3. **Deploy:**
   ```bash
   # Windows
   start-production.bat
   
   # Linux/macOS
   ./start-production.sh
   ```

---

## 🌐 Render Deployment

Deploy to [Render](https://render.com) for cloud hosting.

### Option 1: Blueprint (Recommended)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render auto-detects `render.yaml` and creates services

### Option 2: Manual Setup

**Backend Service:**

| Setting | Value |
|---------|-------|
| Name | `project-edu-api` |
| Runtime | Docker |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |

Environment variables:
```
SECRET_KEY=<generate secure key>
DATABASE_URL=sqlite:///./lecture_slides.db
ALLOWED_ORIGINS=https://your-frontend.onrender.com
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend Service:**

| Setting | Value |
|---------|-------|
| Name | `project-edu` |
| Runtime | Docker |
| Root Directory | `frontend` |
| Dockerfile Path | `./Dockerfile` |

Environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

> **Note**: Free tier services sleep after 15 minutes of inactivity.

---

## 🤗 Hugging Face Spaces

Deploy to [Hugging Face Spaces](https://huggingface.co/spaces) for a quick demo.

The `spaces/` directory contains a standalone Docker deployment:

```bash
cd spaces

# Build locally
docker build -t project-edu-spaces .

# Run locally
docker run -p 7860:7860 project-edu-spaces
```

**Endpoints:**
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/asr` | POST | audio file | `{"transcript": "..."}` |
| `/slides` | POST | `{"transcript": "..."}` | `{"slides": [...]}` |

---

## 🔧 Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | Web framework with async support |
| SQLAlchemy | Database ORM |
| python-jose | JWT authentication |
| Moonshine | Speech-to-text (local) |
| llama-cpp-python | Qwen LLM inference (local) |
| python-pptx | PowerPoint export |
| ReportLab | PDF export |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Zustand | State management |
| Vitest | Testing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| PostgreSQL | Production database |
| Redis | Task queue (optional) |
| Nginx | Reverse proxy |

---

## 📊 API Reference

### Authentication
```
POST /auth/register     # Register with .edu email
POST /auth/token        # Login, returns JWT
GET  /auth/me          # Get current user info
```

### Lectures
```
POST /lectures/process           # Upload and process audio
GET  /lectures/{id}/status      # Check processing status
GET  /lectures/sessions         # List user's sessions
GET  /lectures/{id}            # Get session with slides
```

### Slides
```
PUT  /slides/{id}              # Update slide content
POST /slides/{id}/export       # Start export job
GET  /slides/export/{id}/status # Check export status
GET  /exports/download/{id}     # Download exported file
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest -v                    # Run all tests
pytest test_auth.py -v      # Test authentication
pytest test_integration.py  # Integration tests
```

### Frontend Tests
```bash
cd frontend
npm test                     # Run all tests
npm test -- auth            # Test specific component
```

---

## 🐛 Troubleshooting

### Backend won't start

**Check Python environment:**
```bash
python --version  # Should be 3.11+
pip list | grep fastapi
```

**Check environment variables:**
```bash
cd backend
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('SECRET_KEY'))"
```

**Model loading issues:**
```bash
# Verify model files exist
ls -la ../models/qwen2.5-7b.gguf/
```

### Frontend build fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Docker issues

```bash
# Reset Docker state
docker-compose down -v
docker system prune -f
docker-compose up --build
```

### CORS errors

Update `ALLOWED_ORIGINS` in backend `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

### Model download issues

```bash
# Use alternative download method
pip install huggingface_hub
python -c "
from huggingface_hub import hf_hub_download
hf_hub_download('Qwen/Qwen2.5-7B-Instruct-GGUF', 'qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf', local_dir='models/qwen2.5-7b.gguf')
hf_hub_download('Qwen/Qwen2.5-7B-Instruct-GGUF', 'qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf', local_dir='models/qwen2.5-7b.gguf')
"
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style
- **Backend**: PEP 8, type hints required
- **Frontend**: TypeScript, ESLint rules
- **Tests**: Maintain >80% coverage

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [UsefulSensors](https://github.com/usefulsensors) for Moonshine ASR
- [Qwen Team](https://github.com/QwenLM) for Qwen 2.5 LLM
- [llama.cpp](https://github.com/ggerganov/llama.cpp) for efficient CPU inference
- FastAPI and Next.js communities