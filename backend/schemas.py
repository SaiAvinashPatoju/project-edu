from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class ContentModel(str, Enum):
    """Available LLM models for slide generation."""
    QWEN = "qwen"      # Qwen 2.5 via llama-cpp-python (local)
    GEMMA = "gemma"    # Gemma 2B via llama-cpp-python (local)
    GEMINI = "gemini"  # Google Gemini API (cloud)

# User schemas
class UserBase(BaseModel):
    email: str

class UserCreate(BaseModel):
    email: str
    password: str

class GuestLogin(BaseModel):
    email: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_guest: bool = False
    created_at: datetime
    guest_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GuestLoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    is_guest: bool = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Daily Session schemas
class DailySessionBase(BaseModel):
    date: date
    title: str

class DailySessionCreate(DailySessionBase):
    pass

class DailySessionUpdate(BaseModel):
    title: Optional[str] = None
    course_material: Optional[str] = None

class DailySessionResponse(DailySessionBase):
    id: int
    user_id: int
    course_material: Optional[str] = None
    prepared_images: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Lecture Session schemas
class LectureSessionBase(BaseModel):
    title: Optional[str] = None

class LectureSessionCreate(LectureSessionBase):
    daily_session_id: Optional[int] = None

class LectureSessionResponse(LectureSessionBase):
    id: int
    owner_id: int
    daily_session_id: Optional[int] = None
    transcript: Optional[str] = None
    audio_duration: Optional[int] = None
    processing_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Slide schemas
class SlideBase(BaseModel):
    title: str
    content: str

class SlideCreate(SlideBase):
    slide_number: int
    session_id: int

class SlideUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SlideResponse(SlideBase):
    id: int
    session_id: int
    slide_number: int
    image_url: Optional[str] = None
    confidence_data: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Processing schemas
class ProcessingStartResponse(BaseModel):
    session_id: int
    task_id: str
    status: str
    message: str

class ProcessingStatusResponse(BaseModel):
    status: str
    progress: Optional[int] = None
    error: Optional[str] = None

class SessionWithSlidesResponse(BaseModel):
    session: LectureSessionResponse
    slides: List[SlideResponse]

# Export schemas
class ExportRequest(BaseModel):
    format: str  # "pdf" or "pptx"

class ExportStartResponse(BaseModel):
    export_id: int
    status: str
    message: str

class ExportStatusResponse(BaseModel):
    status: str
    download_url: Optional[str] = None
    error: Optional[str] = None
    expires_at: Optional[datetime] = None
