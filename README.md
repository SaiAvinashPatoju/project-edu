# Project EDU — Lecture to Slides

> Transform classroom lectures into professional slide presentations using local, open-source AI models.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)](https://fastapi.tiangolo.com/)

---

## Overview

**Project EDU** is an offline-first, privacy-preserving web application for educators that automatically converts lecture audio recordings into structured, editable slide presentations. All core AI processing (speech-to-text and slide generation) runs locally on-device using open-source models — no audio or transcript data is ever sent to a cloud provider unless the user explicitly selects the optional Gemini API backend.

**Who is it for?**
- Educators and instructors who want to reduce slide-preparation time
- Institutions with strict data-privacy requirements (FERPA, GDPR)
- Developers and researchers working on on-device AI pipelines

**Core value proposition:**

| Capability | Detail |
|---|---|
| Privacy-first | All processing happens locally by default |
| Teacher-faithful | Generated slides contain only what the teacher said |
| Offline-capable | No internet required after initial model download |
| Multi-format export | PDF and PPTX exports with one click |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser Client                           │
│  Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand   │
│  /record  /dashboard  /editor/:id  /daily-sessions/:id           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP / REST (JWT Bearer)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Nginx Reverse Proxy                        │
│  Rate limiting · Security headers · TLS termination (prod)       │
└──────┬─────────────────────────────────────────────┬─────────────┘
       │ /api/*                                      │ /*
       ▼                                             ▼
┌────────────────────┐                   ┌──────────────────────┐
│  FastAPI Backend   │                   │  Next.js Frontend    │
│  :8000             │                   │  :3000               │
│                    │                   └──────────────────────┘
│  ┌──────────────┐  │
│  │ Auth (JWT)   │  │
│  ├──────────────┤  │
│  │ Processing   │  │   ┌──────────────────────────────────────┐
│  │  Pipeline    │──┼──▶│        Local AI Models               │
│  │              │  │   │  Moonshine ASR (speech-to-text)      │
│  │  Transcribe  │  │   │  Qwen 2.5 3B/7B  (GGUF, llama-cpp)  │
│  │  → Generate  │  │   │  Gemma 3 4B      (GGUF, llama-cpp)   │
│  │  → Save      │  │   │  Gemini 2.0 Flash (cloud, optional)  │
│  ├──────────────┤  │   └──────────────────────────────────────┘
│  │ Export Svc   │  │
│  │ PDF / PPTX   │  │
│  └──────────────┘  │
│         │          │
│         ▼          │
│  ┌────────────┐    │
│  │  Database  │    │
│  │ SQLite/PG  │    │
│  └────────────┘    │
└────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Next.js Frontend** | UI, audio recording via MediaRecorder API, slide editing, export dialog, auth |
| **FastAPI Backend** | REST API, auth, file handling, background task orchestration |
| **TranscriptionService** | Moonshine ASR, ffmpeg audio conversion, chunked processing (60s segments) |
| **ContentGenerator** | LLM prompt construction, JSON parsing, fallback slide generation |
| **ProcessingPipeline** | Orchestrates transcription → slide generation → DB persistence |
| **ExportService** | ReportLab PDF and python-pptx PPTX generation |
| **Nginx** | Reverse proxy, rate limiting, security headers, TLS |
| **PostgreSQL / SQLite** | Persistent storage of users, sessions, slides, export jobs |

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.104 | REST API framework, async support |
| SQLAlchemy | 2.0 | ORM / database abstraction |
| python-jose | 3.4 | JWT creation and validation |
| passlib + bcrypt | 1.7 | Password hashing |
| Moonshine ASR | latest | Local speech-to-text (English) |
| llama-cpp-python | ≥0.2.90 | Local GGUF LLM inference (Qwen / Gemma) |
| google-generativeai | ≥0.3 | Optional Gemini API cloud backend |
| python-pptx | 0.6 | PPTX export |
| ReportLab | 4.0 | PDF export |
| ffmpeg | system | Audio format conversion |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.0 | React framework with App Router |
| TypeScript | 5 | Static typing |
| Tailwind CSS | 3.3 | Utility-first styling |
| Zustand | 4.4 | Lightweight state management |
| Axios | 1.6 | HTTP client |
| Lucide React | latest | Icon library |
| Vitest | 1.0 | Unit / component testing |
| @testing-library/react | 13 | React component test utilities |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerized multi-service deployment |
| PostgreSQL 15 | Production relational database |
| Redis 7 | Task queue (optional, configured in compose) |
| Nginx (Alpine) | Reverse proxy, rate limiting, TLS |
| Render | Cloud PaaS deployment target |
| Hugging Face Spaces | Demo / inference endpoint deployment |

---

## Features

- **In-browser audio recording** — MediaRecorder API captures lecture audio directly in the browser; no external software needed
- **Local speech-to-text** — Moonshine ASR transcribes audio entirely offline; handles files up to 120 minutes via 60-second chunking
- **Multi-model slide generation** — choose between Qwen 2.5 3B/7B (local), Gemma 3 4B (local, lighter), or Gemini 2.0 Flash (cloud) for slide generation
- **Teacher-faithful output** — LLM is instructed with strict rules to use only transcript content; no external knowledge is added
- **Daily session organizer** — group multiple lecture recordings by date; attach course material documents per session
- **In-app slide editor** — edit slide titles and bullet points inline; unsaved changes auto-draft to `localStorage` every 10 seconds
- **Draft recovery** — detects and offers to restore unsaved edits when a session is re-opened
- **PDF export** — per-slide pages via ReportLab; preserves title and bullet points
- **PPTX export** — native PowerPoint slides via python-pptx; fully editable after download
- **Async export jobs** — export runs as a background task; status polling lets users navigate away while waiting
- **Role-based access** — regular accounts require a `.edu` email; guest sessions grant 10-minute trial access with any email
- **JWT authentication** — HS256 tokens; configurable expiry; automatic session expiry enforcement for guests
- **Automatic DB migration** — schema columns are added automatically on startup; no Alembic required for dev

---

## Project Structure

```
project-edu/
├── backend/                        # FastAPI application
│   ├── main.py                     # API entry point; all route definitions
│   ├── auth.py                     # JWT creation, password hashing, .edu validation, guest auth
│   ├── models.py                   # SQLAlchemy ORM models (User, DailySession, LectureSession, Slide, ExportJob)
│   ├── schemas.py                  # Pydantic request/response schemas
│   ├── database.py                 # DB engine setup, session factory, auto-migration on init
│   ├── migrate_db.py               # Standalone migration helper script
│   ├── services/
│   │   ├── transcription.py        # Moonshine ASR wrapper; ffmpeg conversion; chunked processing
│   │   ├── content_generation.py   # LLM backends: QwenContentGenerator, GemmaContentGenerator, GeminiContentGenerator
│   │   ├── processing_pipeline.py  # Orchestrates transcription → slide generation → DB save
│   │   ├── task_manager.py         # Background thread pool for processing tasks
│   │   ├── export_service.py       # PDF (ReportLab) and PPTX (python-pptx) generation
│   │   └── export_task_manager.py  # Background thread pool for export tasks
│   ├── test_auth.py                # Auth unit tests
│   ├── test_integration.py         # Integration tests
│   ├── test_api_integration.py     # API endpoint tests
│   ├── test_content_management.py  # Content CRUD tests
│   ├── test_export.py              # Export service tests
│   ├── test_processing_pipeline.py # Pipeline tests
│   ├── .env.example                # Development environment template
│   ├── production.env.example      # Production environment template
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Backend container image
│   └── pytest.ini                  # Pytest configuration
│
├── frontend/                       # Next.js 14 application
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Landing / redirect
│   │   ├── layout.tsx              # Root layout
│   │   ├── auth/page.tsx           # Auth entry page
│   │   ├── login/page.tsx          # Login form
│   │   ├── register/page.tsx       # Registration form
│   │   ├── dashboard/              # Main user dashboard (session list)
│   │   ├── record/page.tsx         # Audio recording + model selection + upload
│   │   ├── lectures/[sessionId]/processing/page.tsx  # Real-time processing status poller
│   │   ├── editor/[sessionId]/page.tsx               # Slide editor
│   │   └── daily-sessions/[id]/page.tsx              # Daily session detail
│   ├── components/
│   │   ├── auth/                   # AuthGuard, LoginForm, RegisterForm
│   │   ├── dashboard/              # SessionList, DailySessionCard, DailySessionList
│   │   ├── recording/              # AudioRecorder (MediaRecorder API wrapper)
│   │   ├── editor/                 # SlideEditor, SlideCard
│   │   ├── export/                 # ExportDialog, ExportStatus
│   │   ├── processing/             # ProcessingStatus (status poller)
│   │   ├── slides/                 # SlidesViewer (read-only preview)
│   │   └── error/                  # ErrorBoundary, ErrorToast
│   ├── hooks/
│   │   └── useErrorHandler.ts      # Centralised error state hook
│   ├── lib/
│   │   ├── api.ts                  # Axios instance with base URL and auth interceptor
│   │   ├── api-client.ts           # Typed API helper functions
│   │   ├── auth-store.ts           # Zustand auth state (token, user, guest flag)
│   │   ├── draft-manager.ts        # localStorage auto-draft for slide edits
│   │   └── error-handler.ts        # Normalises API errors to user-friendly messages
│   ├── __tests__/                  # Vitest component and workflow tests
│   ├── Dockerfile                  # Frontend container image
│   └── package.json                # Node dependencies and scripts
│
├── spaces/                         # Hugging Face Spaces standalone deployment
│   ├── Dockerfile                  # Combines backend inference endpoints
│   └── README.md                   # HF Spaces metadata (title, sdk, port)
│
├── models/                         # AI model files — NOT committed to git
│   └── qwen2.5-7b.gguf/            # Qwen GGUF split files (download separately)
│
├── docker-compose.yml              # Full-stack Docker Compose (postgres, redis, backend, frontend, nginx)
├── nginx.conf                      # Nginx reverse proxy config with rate limiting
├── render.yaml                     # Render PaaS blueprint (backend + frontend services)
├── setup-dev.sh / setup-dev.bat    # One-shot environment setup scripts
├── start-dev.sh / start-dev.bat    # Dev server launcher scripts
├── start-production.sh / .bat      # Production launcher scripts
├── download_only.py                # Standalone model downloader utility
└── LICENSE                         # MIT License
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build and dev server |
| Git | Latest | Version control |
| ffmpeg | Latest | Audio conversion (must be in `PATH`) |
| Disk space | ~10 GB | AI models + dependencies |

> **ffmpeg installation**
> - **Windows**: `winget install ffmpeg`
> - **macOS**: `brew install ffmpeg`
> - **Linux**: `apt install ffmpeg` or `dnf install ffmpeg`

### Installation

#### Option A — Automated setup (recommended)

```bash
# Clone the repository
git clone https://github.com/SaiAvinashPatoju/project-edu.git
cd project-edu

# Linux / macOS
chmod +x setup-dev.sh && ./setup-dev.sh

# Windows
setup-dev.bat
```

#### Option B — Manual setup

**1. Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit .env with your settings
```

**2. Frontend**

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

**3. Download AI models**

The Moonshine ASR model (~200 MB) downloads automatically on first use.

The Qwen 2.5 GGUF model must be downloaded manually:

```bash
pip install huggingface_hub

# 3B model (~2 GB, recommended for development)
huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF \
  qwen2.5-3b-instruct-q4_k_m.gguf \
  --local-dir models/qwen2.5-3b.gguf

# 7B model (~4 GB, better quality)
huggingface-cli download Qwen/Qwen2.5-7B-Instruct-GGUF \
  qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf \
  qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf \
  --local-dir models/qwen2.5-7b.gguf
```

### Environment Variables

#### `backend/.env`

| Variable | Default | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///./lectures.db` | Yes | SQLAlchemy connection string |
| `SECRET_KEY` | — | **Yes** | JWT signing key — generate with `openssl rand -hex 32` or `python -c 'import secrets; print(secrets.token_hex(32))'` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | No | JWT lifetime in minutes |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated CORS origins |
| `MOONSHINE_MODEL` | `moonshine/base` | No | Moonshine model variant (`moonshine/tiny` or `moonshine/base`) |
| `QWEN_MODEL_PATH` | `../models/qwen2.5-3b.gguf/...` | No | Path to Qwen GGUF file |
| `GEMMA_MODEL_PATH` | `../models/gemma-3-4b.gguf/...` | No | Path to Gemma GGUF file |
| `GEMINI_API_KEY` | — | No | Google Gemini API key (cloud fallback only) |
| `TEMP_FILE_DIR` | `./temp_uploads` | No | Directory for uploaded audio files |
| `MAX_FILE_SIZE_MB` | `500` | No | Upload size limit in MB |
| `MAX_DURATION_MINUTES` | `120` | No | Max lecture duration |
| `BACKGROUND_TASK_TIMEOUT` | `3600` | No | Processing timeout in seconds |
| `CLEANUP_INTERVAL_HOURS` | `24` | No | Interval for temp file cleanup |
| `USE_MOCK_TRANSCRIPTION` | `false` | No | Set `true` to skip Moonshine in tests |

#### `frontend/.env.local`

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

### Running the Project

#### Development

```bash
# Linux / macOS
./start-dev.sh

# Windows
start-dev.bat

# Or start individually:
# Terminal 1 — backend
cd backend && source venv/bin/activate && python main.py

# Terminal 2 — frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

#### Production (Docker Compose)

```bash
# Configure environment files
cp backend/production.env.example backend/.env
cp frontend/.env.production.example frontend/.env.production
# Edit both files with production values

# (Optional) Add TLS certificates
mkdir ssl
# Copy cert.pem and key.pem into ssl/

# Start all services
./start-production.sh     # Linux / macOS
start-production.bat      # Windows
```

---

## API Documentation

Interactive Swagger UI is available at `http://localhost:8000/docs` when the backend is running.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register with `.edu` email; returns JWT |
| `POST` | `/auth/token` | None | Login (OAuth2 form); returns JWT |
| `GET` | `/auth/me` | Bearer | Get current user profile |
| `POST` | `/auth/guest` | None | Guest session (any email, 10-min expiry) |

### Daily Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/daily-sessions` | Bearer | List user's daily sessions |
| `POST` | `/daily-sessions` | Bearer | Create a new daily session |
| `GET` | `/daily-sessions/{id}` | Bearer | Get session details |
| `PUT` | `/daily-sessions/{id}` | Bearer | Update title / course material |
| `DELETE` | `/daily-sessions/{id}` | Bearer | Delete session |
| `POST` | `/daily-sessions/{id}/material` | Bearer | Upload course material (TXT, PDF, DOC, DOCX) |

### Lecture Processing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/lectures/process` | Bearer | Upload audio; start async processing (multipart/form-data) |
| `GET` | `/lectures/{id}/status` | Bearer | Poll processing status |
| `GET` | `/lectures/sessions` | Bearer | List all user lecture sessions |
| `GET` | `/lectures/{id}` | Bearer | Get completed session with slides |
| `DELETE` | `/lectures/{id}` | Bearer | Delete session and slides |

**`POST /lectures/process` form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File` | Yes | Audio file (WAV, MP3, M4A, FLAC, OGG, WebM; ≤500 MB) |
| `title` | `string` | No | Lecture title (auto-generated if omitted) |
| `daily_session_id` | `int` | No | Link to a daily session |
| `model` | `string` | No | `qwen` (default), `gemma`, or `gemini` |

### Slides & Export

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `PUT` | `/slides/{id}` | Bearer | Update slide title / content |
| `POST` | `/slides/{session_id}/export` | Bearer | Start async export job |
| `GET` | `/slides/export/{job_id}/status` | Bearer | Poll export status |
| `GET` | `/exports/download/{job_id}` | Bearer | Download exported file |

### Example: Start Processing

```bash
curl -X POST http://localhost:8000/lectures/process \
  -H "Authorization: Bearer <token>" \
  -F "file=@lecture.wav" \
  -F "title=Intro to Machine Learning" \
  -F "model=qwen"
```

```json
{
  "session_id": 42,
  "task_id": "a1b2c3d4",
  "status": "pending",
  "message": "Processing started with qwen model. Check status for updates."
}
```

### Example: Poll Status

```bash
curl http://localhost:8000/lectures/42/status \
  -H "Authorization: Bearer <token>"
```

```json
{ "status": "completed", "progress": null, "error": null }
```

---

## Deployment

### Docker Compose (self-hosted)

```bash
docker-compose up --build -d   # Build and start all services
docker-compose logs -f         # Stream logs
docker-compose down            # Stop all services
docker-compose down -v         # Stop and remove volumes
```

Services started by `docker-compose.yml`:

| Service | Image | Port | Notes |
|---|---|---|---|
| `postgres` | postgres:15-alpine | 5432 | Production database with health check |
| `redis` | redis:7-alpine | 6379 | Optional task queue |
| `backend` | custom (Dockerfile) | 8000 | FastAPI, depends on postgres + redis |
| `frontend` | custom (Dockerfile) | 3000 | Next.js, depends on backend |
| `nginx` | nginx:alpine | 80, 443 | Reverse proxy; requires TLS certs for HTTPS |

### Render (cloud PaaS)

The repository includes a `render.yaml` blueprint for one-click deployment to [Render](https://render.com):

1. Push code to GitHub
2. Go to **Render Dashboard → New → Blueprint**
3. Connect the repository — Render auto-detects `render.yaml`
4. Set `SECRET_KEY` and `GOOGLE_API_KEY` (if using Gemini) in the Render dashboard
5. Deploy

> ⚠️ **Assumption**: The Render free tier services sleep after 15 minutes of inactivity, causing cold-start delays on first request.

### Hugging Face Spaces

The `spaces/` directory provides a standalone Docker image exposing only the inference endpoints:

```bash
cd spaces
docker build -t project-edu-spaces .
docker run -p 7860:7860 project-edu-spaces
```

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/asr` | POST | audio file | `{"transcript": "..."}` |
| `/slides` | POST | `{"transcript": "..."}` | `{"slides": [...]}` |

> ❗ **Needs verification**: The Spaces deployment requires a CPU-upgrade tier (~16 GB RAM) to load both Moonshine and the GGUF model simultaneously.

---

## Testing

### Backend

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest -v

# Run specific suites
pytest test_auth.py -v                  # Auth and JWT tests
pytest test_integration.py -v          # End-to-end API integration
pytest test_api_integration.py -v      # Individual endpoint tests
pytest test_content_management.py -v   # Slide CRUD tests
pytest test_export.py -v               # PDF / PPTX export tests
pytest test_processing_pipeline.py -v  # Pipeline orchestration tests

# Skip model-dependent tests in CI (no models installed)
USE_MOCK_TRANSCRIPTION=true pytest -v
```

### Frontend

```bash
cd frontend

npm test              # Run all tests (Vitest, single-run)
npm run test -- auth  # Run tests matching "auth"
```

Test files are located in `frontend/__tests__/` and cover:

| File | Coverage area |
|---|---|
| `auth.test.tsx` | Login, register, guest auth flow |
| `dashboard.test.tsx` | Session list rendering |
| `recording-workflow.test.tsx` | Audio capture and upload |
| `slide-editor.test.tsx` | Inline slide editing |
| `export.test.tsx` | Export dialog and polling |
| `draft-manager.test.ts` | localStorage draft save / restore |
| `e2e-workflow.test.tsx` | Full record → process → edit → export flow |
| `error-handling.test.tsx` | Error boundary and toast behavior |

> ⚠️ **Assumption**: Target test coverage is >80% (per `CONTRIBUTING` guidelines). Actual measured coverage has not been verified.

---

## Observability

### Logging

- **Backend**: Python `logging` module with `logging.getLogger(__name__)` per module; log level configurable via `LOG_LEVEL` environment variable (default `INFO` in production)
- **Frontend**: Browser `console.log` / `console.error`; no structured logging library is currently integrated

### Health Checks

| Endpoint | Service | Notes |
|---|---|---|
| `GET /` | Backend | Returns `{"message": "Lecture to Slides API"}` |
| `GET /health` | Nginx | Returns `200 healthy` (no auth required) |
| Docker healthcheck | postgres, redis, backend | Configured in `docker-compose.yml` |

### Error Tracking

- `SENTRY_DSN` environment variable is declared in `production.env.example`
- ❗ **Needs verification**: Sentry SDK integration code has not been confirmed in the current backend source. Configure and verify before production use.

---

## Security

| Practice | Implementation |
|---|---|
| Password hashing | bcrypt via `passlib` |
| Authentication | JWT HS256 (`python-jose`); tokens expire per `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Email restriction | Registration enforces `.edu` domain regex validation |
| Guest session expiry | Hard-coded 10-minute expiry; enforced on every authenticated request |
| CORS | Explicit allow-list via `ALLOWED_ORIGINS`; credentials allowed |
| Security headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy` set by Nginx |
| Rate limiting | Nginx: 10 req/s for API, 1 req/s for `/lectures/process`; burst buffers configured |
| Upload size limit | 500 MB enforced at both Nginx (`client_max_body_size`) and FastAPI layers |
| File type validation | MIME-type checked against allow-list on upload |
| Data privacy | Audio and transcripts processed locally; no data transmitted to third parties by default |
| TLS | Nginx HTTPS config provided (commented); TLSv1.2+ with strong cipher suites |
| Secret management | `SECRET_KEY` loaded from environment; never hardcoded |

> **Production checklist before going live:**
> 1. Generate a cryptographically random `SECRET_KEY`: `openssl rand -hex 32` or `python -c 'import secrets; print(secrets.token_hex(32))'`
> 2. Set `ALLOWED_ORIGINS` to your exact frontend domain(s)
> 3. Enable Nginx HTTPS and provide valid TLS certificates
> 4. Switch `DATABASE_URL` from SQLite to PostgreSQL
> 5. Review and rotate all secrets; do not commit `.env` files

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make changes with tests; maintain >80% coverage
4. Commit with a descriptive message: `git commit -m 'feat: add X'`
5. Push and open a Pull Request against `main`

### Code Style

| Layer | Standard |
|---|---|
| Backend (Python) | PEP 8; type hints required on all public functions |
| Frontend (TypeScript) | ESLint (`eslint-config-next`); no `any` types without justification |
| Commits | Conventional Commits preferred (`feat:`, `fix:`, `docs:`, `chore:`) |

### Running the Dev Environment

See [Getting Started](#getting-started). Use `USE_MOCK_TRANSCRIPTION=true` to develop without downloading AI models.

---

## Roadmap

- [ ] Word-level confidence highlighting in transcript editor view
- [ ] Real-time processing progress percentage (currently `null`)
- [ ] PDF parser for binary course material uploads (currently stores placeholder text)
- [ ] Alembic migrations to replace inline auto-migration logic
- [ ] Sentry integration for production error tracking
- [ ] Redis-backed background task queue (infrastructure present in compose, not yet wired to task manager)
- [ ] Multi-language support (Moonshine is currently English-only)
- [ ] Slide image search / embedding based on `image_keywords` field
- [ ] Real-time collaboration on slide editing
- [ ] Rate limiting on auth endpoints (brute-force protection)

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version   # must be 3.11+

# Verify SECRET_KEY is set
cd backend && python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(bool(os.getenv('SECRET_KEY')))"

# Check model path
ls -la ../models/qwen2.5-3b.gguf/
```

### Frontend build fails

```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Docker issues

```bash
docker-compose down -v
docker system prune -f
docker-compose up --build
```

### CORS errors

Add the frontend origin to `ALLOWED_ORIGINS` in `backend/.env`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

### Model download fails

```python
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Qwen/Qwen2.5-3B-Instruct-GGUF',
    'qwen2.5-3b-instruct-q4_k_m.gguf',
    local_dir='models/qwen2.5-3b.gguf'
)
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [UsefulSensors](https://github.com/usefulsensors) for the Moonshine ASR model
- [Qwen Team / Alibaba Cloud](https://github.com/QwenLM) for Qwen 2.5
- [Google DeepMind](https://ai.google.dev/) for Gemma 3
- [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) for efficient CPU inference
- FastAPI, Next.js, and the open-source communities that make this stack possible

