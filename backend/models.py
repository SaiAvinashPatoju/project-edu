from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Guest user fields
    is_guest = Column(Boolean, default=False)
    guest_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    lecture_sessions = relationship("LectureSession", back_populates="owner")
    daily_sessions = relationship("DailySession", back_populates="owner")


class DailySession(Base):
    """Day-wise session for organizing lectures by date."""
    __tablename__ = "daily_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    course_material = Column(Text, nullable=True)  # Uploaded course material text
    prepared_images = Column(Text, nullable=True)  # JSON array of prepared image URLs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="daily_sessions")
    lecture_sessions = relationship("LectureSession", back_populates="daily_session")


class LectureSession(Base):
    __tablename__ = "lecture_sessions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    daily_session_id = Column(Integer, ForeignKey("daily_sessions.id"), nullable=True)
    title = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    audio_duration = Column(Integer, nullable=True)  # Duration in seconds
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="lecture_sessions")
    daily_session = relationship("DailySession", back_populates="lecture_sessions")
    slides = relationship("Slide", back_populates="session", cascade="all, delete-orphan")


class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    slide_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # JSON array of bullet points
    image_url = Column(String, nullable=True)  # Prepared image for this slide
    confidence_data = Column(Text, nullable=True)  # JSON with word-level confidence
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    session = relationship("LectureSession", back_populates="slides")


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    export_format = Column(String, nullable=False)  # "pdf" or "pptx"
    status = Column(String, default="pending")  # pending, processing, completed, failed
    file_path = Column(String, nullable=True)  # Path to generated file
    download_url = Column(String, nullable=True)  # URL for downloading
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # When file expires

    # Relationships
    session = relationship("LectureSession")
    user = relationship("User")
