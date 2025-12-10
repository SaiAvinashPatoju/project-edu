# Lecture to Slides

Transform your lectures into professional slide presentations using AI-powered transcription and content generation.

## 🎯 Overview

Lecture to Slides is a comprehensive web application that allows educators to record lectures and automatically generate structured slide presentations. The system uses advanced AI for transcription and content organization, providing an intuitive editing interface for refinement.

## 🏗️ Architecture

```
├── backend/              # FastAPI backend with AI processing
├── frontend/             # Next.js frontend with React components
├── docker-compose.yml    # Production deployment configuration
├── nginx.conf           # Reverse proxy configuration
└── README.md
```

## 🚀 Quick Start

### Development Setup

#### Automated Setup (Recommended)
```bash
# Windows - First time setup
setup-dev.bat

# Linux/macOS - First time setup
chmod +x setup-dev.sh && ./setup-dev.sh
```

#### Start Development Servers
```bash
# Windows - Start both servers
start-dev.bat

# Linux/macOS - Start both servers
chmod +x start-dev.sh && ./start-dev.sh
```

#### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/macOS
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Production Deployment

#### Using Docker (Recommended)
```bash
# Copy and configure environment files
cp backend/production.env.example backend/.env
cp frontend/.env.production.example frontend/.env.production

# Start production services
# Windows
start-production.bat

# Linux/macOS
chmod +x start-production.sh && ./start-production.sh
```

### 🌐 Render Deployment

**1. Using Render Blueprint (Easiest):**
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repo
5. Render will auto-detect `render.yaml` and create services

**2. Manual Render Setup:**

**Backend Service:**
- Type: Web Service
- Runtime: Docker
- Dockerfile Path: `./backend/Dockerfile`
- Environment Variables:
  - `SECRET_KEY` - Generate a secure random key
  - `GOOGLE_API_KEY` - Your Gemini API key
  - `DATABASE_URL` - `sqlite:///./lecture_slides.db`
  - `ALLOWED_ORIGINS` - Your frontend URL

**Frontend Service:**
- Type: Web Service  
- Runtime: Docker
- Dockerfile Path: `./frontend/Dockerfile`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL` - Your backend service URL

#### Manual Production Setup
See [Production Deployment Guide](#production-deployment) below.

## 📋 Features

### ✅ Phase 1: Authentication System
- **Secure Authentication**: JWT tokens with bcrypt password hashing
- **Educational Email Validation**: Requires .edu email addresses
- **Protected Routes**: Role-based access control
- **Session Management**: Automatic token refresh and logout

### ✅ Phase 2: Audio Processing Pipeline
- **Audio Recording**: Browser-based recording with MediaRecorder API
- **File Upload**: Support for multiple audio formats (WAV, MP3, M4A, etc.)
- **Transcription**: AI-powered speech-to-text with confidence scoring
- **Content Generation**: Automatic slide structure creation

### ✅ Phase 3: Content Management
- **Slide Editor**: Intuitive web-based editing interface
- **Draft Management**: Auto-save and recovery functionality
- **Confidence Highlighting**: Visual indicators for low-confidence transcriptions
- **Real-time Updates**: Live preview of changes

### ✅ Phase 4: Export & Sharing
- **Multiple Formats**: PDF and PowerPoint export options
- **Asynchronous Processing**: Background export generation
- **Download Management**: Secure file delivery with expiration
- **Session Dashboard**: Manage all lecture sessions

### ✅ Phase 5: Production Readiness
- **Global Error Handling**: Comprehensive error management system
- **Security Hardening**: CORS policies, input validation, dependency auditing
- **Performance Optimization**: Caching, compression, rate limiting
- **Monitoring & Logging**: Health checks and error tracking

## 🔧 Technology Stack

### Backend
- **Framework**: FastAPI with async support
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT with python-jose
- **AI Services**: 
  - faster-whisper for transcription
  - Google Gemini API for content generation
- **File Processing**: Background tasks with concurrent.futures
- **Export**: ReportLab (PDF) and python-pptx (PowerPoint)

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library
- **Error Handling**: React Error Boundaries

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx with rate limiting
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session and task management
- **Monitoring**: Health checks and logging

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Secure password hashing with bcrypt
- .edu email domain validation
- Protected API routes with middleware
- Session timeout and refresh handling

### Data Protection
- Input validation and sanitization
- SQL injection prevention (SQLAlchemy ORM)
- File upload security (type and size validation)
- CORS policy configuration
- Rate limiting on API endpoints

### Privacy & Compliance
- Automatic file cleanup (24-hour retention)
- Secure temporary file handling
- Data encryption at rest
- FERPA compliance considerations
- User data anonymization options

## 📊 API Documentation

### Authentication Endpoints
```
POST /auth/register     # User registration
POST /auth/token        # User login
GET  /auth/me          # Get current user
```

### Lecture Processing
```
POST /lectures/process           # Upload and process audio
GET  /lectures/{id}/status      # Check processing status
GET  /lectures/sessions         # List user sessions
GET  /lectures/{id}            # Get session with slides
```

### Content Management
```
PUT  /slides/{id}              # Update slide content
POST /slides/{id}/export       # Start export job
GET  /slides/export/{id}/status # Check export status
GET  /exports/download/{id}     # Download exported file
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest -v                    # Run all tests
pytest test_auth.py -v      # Test authentication
pytest test_integration.py  # Integration tests
python security_audit.py    # Security audit
```

### Frontend Testing
```bash
cd frontend
npm test                     # Run all tests
npm test -- auth            # Test authentication components
npm test -- error-handling  # Test error handling
npm test -- e2e-workflow    # End-to-end tests
```

### System Testing
```bash
debug.bat                    # Windows system diagnostics
./debug.sh                  # Linux/macOS system diagnostics
```

## 🚀 Production Deployment

### Prerequisites
- Docker & Docker Compose
- PostgreSQL database
- Redis server (optional but recommended)
- SSL certificates (for HTTPS)
- Domain name and DNS configuration

### Environment Configuration

**Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lecture_to_slides

# Security
SECRET_KEY=your_secure_random_key_here
ALLOWED_ORIGINS=https://yourdomain.com

# AI Services
GOOGLE_API_KEY=your_gemini_api_key

# Optional
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=your_sentry_dsn
```

**Frontend (.env.production):**
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Deployment Steps

1. **Clone and Configure**
   ```bash
   git clone <repository>
   cd lecture-to-slides
   cp backend/production.env.example backend/.env
   cp frontend/.env.production.example frontend/.env.production
   # Edit configuration files
   ```

2. **SSL Setup**
   ```bash
   mkdir ssl
   # Copy your SSL certificates to ssl/cert.pem and ssl/key.pem
   ```

3. **Deploy**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

4. **Health Check**
   ```bash
   curl http://localhost/health
   ```

### Monitoring & Maintenance

- **Health Checks**: Built-in endpoints for service monitoring
- **Log Management**: Centralized logging with Docker
- **Backup Strategy**: Database and file backup procedures
- **Update Process**: Rolling updates with zero downtime
- **Security Updates**: Regular dependency and security audits

## 🔧 Configuration

### File Size Limits
- Maximum upload: 500MB
- Maximum duration: 120 minutes
- Processing timeout: 50% of audio duration

### Performance Tuning
- **Backend**: Adjust worker count based on CPU cores
- **Database**: Configure connection pooling
- **Redis**: Set appropriate memory limits
- **Nginx**: Tune worker processes and connections

### Scaling Considerations
- **Horizontal Scaling**: Load balancer with multiple backend instances
- **Database**: Read replicas for improved performance
- **File Storage**: Cloud storage (AWS S3, Google Cloud Storage)
- **Task Queue**: Celery with Redis/RabbitMQ for heavy workloads

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check environment variables
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('SECRET_KEY'))"

# Check database connection
python -c "from database import engine; print(engine.url)"
```

**Frontend build fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Docker issues:**
```bash
# Reset Docker state
docker-compose down -v
docker system prune -f
docker-compose up --build
```

### Performance Issues
- Check system resources (CPU, memory, disk)
- Monitor database query performance
- Review application logs for bottlenecks
- Verify network connectivity to AI services

### Security Concerns
- Run security audit: `python backend/security_audit.py`
- Check for dependency vulnerabilities: `safety check`
- Review access logs for suspicious activity
- Verify SSL certificate validity

## 📚 Development Guide

### Adding New Features
1. Update requirements and design documents
2. Implement backend API endpoints
3. Add frontend components and pages
4. Write comprehensive tests
5. Update documentation

### Code Style
- **Backend**: Follow PEP 8, use type hints
- **Frontend**: Use TypeScript, follow React best practices
- **Testing**: Maintain >80% code coverage
- **Documentation**: Update README and API docs

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request
5. Ensure all checks pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Security**: Report security vulnerabilities privately
- **Community**: Join our discussion forums for help and tips

## 🎉 Acknowledgments

- FastAPI for the excellent web framework
- Next.js for the powerful React framework
- OpenAI Whisper for speech recognition capabilities
- Google Gemini for content generation
- All contributors and testers who helped improve this project