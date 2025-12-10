# 🛠️ Development Guide

Comprehensive guide for developing and maintaining the Lecture to Slides application.

## 🚀 Quick Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- Google Gemini API key

### Environment Files

**backend/.env:**
```env
DATABASE_URL=sqlite:///./lectures.db
SECRET_KEY=your_jwt_secret_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
WHISPER_MODEL_SIZE=base
TEMP_FILE_DIR=./temp_uploads
MAX_FILE_SIZE_MB=500
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Installation

```bash
# Automated setup (recommended)
# Windows
setup-dev.bat
# Linux/macOS
./setup-dev.sh

# Or manually:
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Start Development

```bash
# Use the automated script
# Windows
start-dev.bat
# Linux/macOS
./start-dev.sh

# Or manually:
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend  
cd frontend && npm run dev
```

## 📁 Project Structure

```
├── backend/
│   ├── services/          # Business logic
│   ├── auth.py           # Authentication
│   ├── main.py           # FastAPI app
│   ├── models.py         # Database models
│   └── schemas.py        # API schemas
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── __tests__/        # Tests
└── start-dev.bat         # Development startup
```

## 🧪 Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

## 🔧 Key APIs

### Authentication
- `POST /auth/register` - Register with .edu email
- `POST /auth/token` - Login
- `GET /auth/me` - Get user info

### Lectures
- `POST /lectures/process` - Upload audio
- `GET /lectures/{id}/status` - Check processing
- `GET /lectures/sessions` - List sessions

### Slides
- `PUT /slides/{id}` - Update slide
- `POST /slides/{id}/export` - Export slides

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check environment
python -c "import os; print(os.getenv('SECRET_KEY'))"
```

**Frontend build fails:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**API connection issues:**
```bash
curl http://localhost:8000/docs
```

## 📦 Production

See `DEPLOYMENT.md` for production deployment with Docker.

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Add tests
4. Submit pull request

---

For detailed information, see the full documentation in the codebase.