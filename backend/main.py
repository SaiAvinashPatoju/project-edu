import os
import uuid
import tempfile
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List

from database import get_db, init_db
from auth import (
    authenticate_user, 
    create_user, 
    create_guest_user,
    create_access_token,
    create_guest_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    GUEST_TOKEN_EXPIRE_MINUTES
)
from schemas import (
    UserCreate, UserResponse, Token, LectureSessionCreate, LectureSessionResponse,
    ProcessingStartResponse, ProcessingStatusResponse, SessionWithSlidesResponse,
    SlideResponse, SlideUpdate, ExportRequest, ExportStartResponse, ExportStatusResponse,
    GuestLogin, GuestLoginResponse, DailySessionCreate, DailySessionUpdate, DailySessionResponse
)
from models import User, LectureSession, Slide, ExportJob, DailySession
from services import processing_pipeline, task_manager
from services.export_task_manager import export_task_manager

# Initialize database
init_db()

app = FastAPI(title="Lecture to Slides API", version="1.0.0")

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
async def root():
    return {"message": "Lecture to Slides API"}

@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with .edu email validation"""
    try:
        db_user = create_user(db, email=user.email, password=user.password)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login endpoint that returns JWT token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@app.post("/auth/guest", response_model=GuestLoginResponse)
async def guest_login(guest: GuestLogin, db: Session = Depends(get_db)):
    """Guest login with email only - 10 minute session"""
    try:
        guest_user = create_guest_user(db, email=guest.email)
        access_token = create_guest_access_token(data={"sub": guest_user.email})
        return GuestLoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_at=guest_user.guest_expires_at,
            is_guest=True
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Guest login failed: {str(e)}"
        )

# Daily Session endpoints
@app.get("/daily-sessions", response_model=List[DailySessionResponse])
async def get_daily_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all daily sessions for the current user"""
    sessions = db.query(DailySession).filter(
        DailySession.user_id == current_user.id
    ).order_by(DailySession.date.desc()).all()
    return sessions

@app.post("/daily-sessions", response_model=DailySessionResponse)
async def create_daily_session(
    session: DailySessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new daily session"""
    db_session = DailySession(
        user_id=current_user.id,
        date=session.date,
        title=session.title
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/daily-sessions/{session_id}", response_model=DailySessionResponse)
async def get_daily_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific daily session"""
    session = db.query(DailySession).filter(
        DailySession.id == session_id,
        DailySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Daily session not found")
    return session

@app.put("/daily-sessions/{session_id}", response_model=DailySessionResponse)
async def update_daily_session(
    session_id: int,
    session_update: DailySessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a daily session"""
    session = db.query(DailySession).filter(
        DailySession.id == session_id,
        DailySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Daily session not found")
    
    if session_update.title is not None:
        session.title = session_update.title
    if session_update.course_material is not None:
        session.course_material = session_update.course_material
    
    db.commit()
    db.refresh(session)
    return session

@app.delete("/daily-sessions/{session_id}")
async def delete_daily_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a daily session"""
    session = db.query(DailySession).filter(
        DailySession.id == session_id,
        DailySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Daily session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Daily session deleted"}

@app.post("/daily-sessions/{session_id}/material")
async def upload_course_material(
    session_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload course material to a daily session for AI pre-processing"""
    session = db.query(DailySession).filter(
        DailySession.id == session_id,
        DailySession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Daily session not found")
    
    # Validate file type
    valid_types = {'text/plain', 'application/pdf', 'application/msword',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
    if file.content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported: TXT, PDF, DOC, DOCX"
        )
    
    # Read file content (for now just store text, PDF parsing can be added later)
    content = await file.read()
    if file.content_type == 'text/plain':
        session.course_material = content.decode('utf-8')
    else:
        # For binary files, store as base64 or implement PDF parser
        session.course_material = f"[Binary file: {file.filename}]"
    
    db.commit()
    db.refresh(session)
    
    return {
        "message": "Course material uploaded",
        "session_id": session_id,
        "filename": file.filename
    }

# Lecture processing endpoints
@app.post("/lectures/process", response_model=ProcessingStartResponse)
async def process_lecture(
    file: UploadFile = File(...),
    title: str = None,
    daily_session_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Start processing an uploaded lecture audio file"""
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file size (500MB limit)
    max_size = int(os.getenv("MAX_FILE_SIZE_MB", "500")) * 1024 * 1024
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
        )
    
    # Validate file type
    valid_types = {'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg', 'audio/webm'}
    if file.content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported formats: WAV, MP3, M4A, FLAC, OGG, WebM"
        )
    
    try:
        # Create lecture session
        session = LectureSession(
            owner_id=current_user.id,
            daily_session_id=daily_session_id,
            title=title or f"Lecture {uuid.uuid4().hex[:8]}",
            processing_status="pending"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Save uploaded file to temporary location
        temp_dir = os.getenv("TEMP_FILE_DIR", tempfile.gettempdir())
        os.makedirs(temp_dir, exist_ok=True)
        
        file_extension = os.path.splitext(file.filename)[1] or '.wav'
        temp_filename = f"{uuid.uuid4().hex}{file_extension}"
        temp_filepath = os.path.join(temp_dir, temp_filename)
        
        # Write file to disk
        with open(temp_filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Submit processing task
        task_id = processing_pipeline.submit_processing_task(session.id, temp_filepath)
        
        return ProcessingStartResponse(
            session_id=session.id,
            task_id=task_id,
            status="pending",
            message="Processing started. Check status for updates."
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start processing: {str(e)}"
        )

@app.get("/lectures/{session_id}/status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the processing status of a lecture session"""
    
    # Verify session belongs to user
    session = db.query(LectureSession).filter(
        LectureSession.id == session_id,
        LectureSession.owner_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return ProcessingStatusResponse(
        status=session.processing_status,
        progress=None,  # Could be enhanced with actual progress tracking
        error=None if session.processing_status != "failed" else "Processing failed"
    )

@app.get("/lectures/sessions", response_model=List[LectureSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all lecture sessions for the current user"""
    
    sessions = db.query(LectureSession).filter(
        LectureSession.owner_id == current_user.id
    ).order_by(LectureSession.created_at.desc()).all()
    
    return sessions

@app.delete("/lectures/{session_id}")
async def delete_lecture_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a lecture session and all associated slides"""
    
    # Verify session belongs to user
    session = db.query(LectureSession).filter(
        LectureSession.id == session_id,
        LectureSession.owner_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found")
    
    # Delete associated export jobs first
    db.query(ExportJob).filter(ExportJob.session_id == session_id).delete()
    
    # Delete the session (slides cascade delete automatically)
    db.delete(session)
    db.commit()
    
    return {"message": "Lecture session deleted"}

@app.get("/lectures/{session_id}", response_model=SessionWithSlidesResponse)
async def get_session_with_slides(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a lecture session with its slides"""
    
    # Verify session belongs to user and is completed
    session = db.query(LectureSession).filter(
        LectureSession.id == session_id,
        LectureSession.owner_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.processing_status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Session not ready. Status: {session.processing_status}"
        )
    
    # Get slides
    slides = db.query(Slide).filter(
        Slide.session_id == session_id
    ).order_by(Slide.slide_number).all()
    
    return SessionWithSlidesResponse(
        session=session,
        slides=slides
    )

@app.put("/slides/{slide_id}", response_model=SlideResponse)
async def update_slide(
    slide_id: int,
    slide_update: SlideUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a slide's content"""
    
    # Get slide and verify ownership
    slide = db.query(Slide).join(LectureSession).filter(
        Slide.id == slide_id,
        LectureSession.owner_id == current_user.id
    ).first()
    
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    
    # Update slide
    if slide_update.title is not None:
        slide.title = slide_update.title
    if slide_update.content is not None:
        slide.content = slide_update.content
    
    slide.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(slide)
    
    return slide

# Export endpoints
@app.post("/slides/{session_id}/export", response_model=ExportStartResponse)
async def start_export(
    session_id: int,
    export_request: ExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Start an export job for a lecture session"""
    
    # Validate export format
    if export_request.format not in ["pdf", "pptx"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid export format. Supported formats: pdf, pptx"
        )
    
    # Verify session belongs to user and is completed
    session = db.query(LectureSession).filter(
        LectureSession.id == session_id,
        LectureSession.owner_id == current_user.id,
        LectureSession.processing_status == "completed"
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or not ready for export"
        )
    
    # Check if slides exist
    slide_count = db.query(Slide).filter(Slide.session_id == session_id).count()
    if slide_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No slides found for this session"
        )
    
    try:
        # Create export job
        export_job = ExportJob(
            session_id=session_id,
            user_id=current_user.id,
            export_format=export_request.format,
            status="pending"
        )
        db.add(export_job)
        db.commit()
        db.refresh(export_job)
        
        # Submit background task
        task_id = export_task_manager.submit_export_task(export_job.id)
        
        return ExportStartResponse(
            export_id=export_job.id,
            status="pending",
            message=f"Export job started. Format: {export_request.format}"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start export: {str(e)}"
        )

@app.get("/slides/export/{export_id}/status", response_model=ExportStatusResponse)
async def get_export_status(
    export_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the status of an export job"""
    
    # Get export job and verify ownership
    export_job = db.query(ExportJob).filter(
        ExportJob.id == export_id,
        ExportJob.user_id == current_user.id
    ).first()
    
    if not export_job:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    return ExportStatusResponse(
        status=export_job.status,
        download_url=export_job.download_url if export_job.status == "completed" else None,
        error=export_job.error_message if export_job.status == "failed" else None,
        expires_at=export_job.expires_at
    )

@app.get("/exports/download/{export_id}")
async def download_export(
    export_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download an exported file"""
    from fastapi.responses import FileResponse
    
    # Get export job and verify ownership
    export_job = db.query(ExportJob).filter(
        ExportJob.id == export_id,
        ExportJob.user_id == current_user.id,
        ExportJob.status == "completed"
    ).first()
    
    if not export_job:
        raise HTTPException(status_code=404, detail="Export not found or not ready")
    
    # Check if file still exists and hasn't expired
    if not export_job.file_path or not os.path.exists(export_job.file_path):
        raise HTTPException(status_code=410, detail="Export file no longer available")
    
    if export_job.expires_at and export_job.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Export file has expired")
    
    # Get session for filename
    session = db.query(LectureSession).filter(
        LectureSession.id == export_job.session_id
    ).first()
    
    # Generate download filename
    safe_title = "".join(c for c in (session.title or "lecture") if c.isalnum() or c in (' ', '-', '_')).rstrip()
    download_filename = f"{safe_title}.{export_job.export_format}"
    
    return FileResponse(
        path=export_job.file_path,
        filename=download_filename,
        media_type='application/octet-stream'
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)