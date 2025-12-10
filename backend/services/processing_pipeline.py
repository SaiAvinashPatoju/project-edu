"""
Main processing pipeline that orchestrates transcription and slide generation.
"""
import os
import json
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from .transcription import TranscriptionService
from .content_generation import ContentGenerationService
from .task_manager import task_manager
from models import LectureSession, Slide
from database import SessionLocal

logger = logging.getLogger(__name__)

class ProcessingPipeline:
    """Orchestrates the complete lecture processing pipeline."""
    
    def __init__(self):
        """Initialize the processing pipeline."""
        self.transcription_service = TranscriptionService(
            model_size=os.getenv("WHISPER_MODEL_SIZE", "base")
        )
        self.content_generation_service = ContentGenerationService()
    
    def process_lecture(self, session_id: int, audio_file_path: str) -> Dict[str, Any]:
        """
        Process a lecture through the complete pipeline.
        
        Args:
            session_id: Database ID of the lecture session
            audio_file_path: Path to the uploaded audio file
            
        Returns:
            Dictionary with processing results
            
        Raises:
            Exception: If any step in the pipeline fails
        """
        logger.info(f"Starting lecture processing for session {session_id}")
        
        try:
            # Step 1: Update session status to processing
            self._update_session_status(session_id, "processing")
            
            # Step 2: Transcribe audio
            logger.info(f"Step 1: Transcribing audio for session {session_id}")
            transcription_result = self.transcription_service.transcribe_audio(audio_file_path)
            
            # Update session with transcript
            self._update_session_transcript(
                session_id, 
                transcription_result.text,
                transcription_result.duration
            )
            
            # Step 3: Generate slides from transcript
            logger.info(f"Step 2: Generating slides for session {session_id}")
            slide_generation_result = self.content_generation_service.generate_slides(
                transcription_result.text
            )
            
            # Step 4: Save slides to database
            logger.info(f"Step 3: Saving slides for session {session_id}")
            self._save_slides_to_database(
                session_id,
                slide_generation_result.slides,
                transcription_result.low_confidence_words
            )
            
            # Step 5: Update session status to completed
            self._update_session_status(session_id, "completed")
            
            # Clean up audio file
            self._cleanup_audio_file(audio_file_path)
            
            result = {
                'session_id': session_id,
                'transcript_length': len(transcription_result.text),
                'slides_generated': len(slide_generation_result.slides),
                'language': transcription_result.language,
                'duration': transcription_result.duration,
                'low_confidence_words_count': len(transcription_result.low_confidence_words),
                'processing_metadata': slide_generation_result.metadata
            }
            
            logger.info(f"Lecture processing completed for session {session_id}")
            return result
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Lecture processing failed for session {session_id}: {str(e)}")
            logger.error(f"Full traceback:\n{error_details}")
            
            # Update session status to failed with error details
            self._update_session_status(session_id, "failed")
            
            # Clean up audio file
            self._cleanup_audio_file(audio_file_path)
            
            raise Exception(f"Processing failed: {str(e)}")
    
    def submit_processing_task(self, session_id: int, audio_file_path: str) -> str:
        """
        Submit a lecture processing task to the background queue.
        
        Args:
            session_id: Database ID of the lecture session
            audio_file_path: Path to the uploaded audio file
            
        Returns:
            Task ID for tracking the processing
        """
        task_id = task_manager.submit_task(
            self.process_lecture,
            session_id,
            audio_file_path
        )
        
        logger.info(f"Processing task {task_id} submitted for session {session_id}")
        return task_id
    
    def _update_session_status(self, session_id: int, status: str):
        """Update the processing status of a lecture session."""
        db = SessionLocal()
        try:
            session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
            if session:
                session.processing_status = status
                session.updated_at = datetime.utcnow()
                db.commit()
                logger.debug(f"Session {session_id} status updated to {status}")
            else:
                logger.error(f"Session {session_id} not found for status update")
        except Exception as e:
            logger.error(f"Failed to update session status: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    def _update_session_transcript(self, session_id: int, transcript: str, duration: float):
        """Update the session with transcript and duration."""
        db = SessionLocal()
        try:
            session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
            if session:
                session.transcript = transcript
                session.audio_duration = int(duration)
                session.updated_at = datetime.utcnow()
                db.commit()
                logger.debug(f"Session {session_id} transcript updated")
            else:
                logger.error(f"Session {session_id} not found for transcript update")
        except Exception as e:
            logger.error(f"Failed to update session transcript: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    def _save_slides_to_database(self, session_id: int, slides, low_confidence_words):
        """Save generated slides to the database."""
        db = SessionLocal()
        try:
            # Delete existing slides for this session (in case of reprocessing)
            db.query(Slide).filter(Slide.session_id == session_id).delete()
            
            # Create new slides
            for i, slide_content in enumerate(slides):
                # Create confidence data
                confidence_data = {
                    'low_confidence_words': low_confidence_words,
                    'slide_number': i + 1
                }
                
                slide = Slide(
                    session_id=session_id,
                    slide_number=i + 1,
                    title=slide_content.title,
                    content=json.dumps(slide_content.content),  # Store as JSON
                    confidence_data=json.dumps(confidence_data)
                )
                db.add(slide)
            
            db.commit()
            logger.debug(f"Saved {len(slides)} slides for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to save slides: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def _cleanup_audio_file(self, audio_file_path: str):
        """Clean up the temporary audio file."""
        try:
            if os.path.exists(audio_file_path):
                os.remove(audio_file_path)
                logger.debug(f"Cleaned up audio file: {audio_file_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up audio file {audio_file_path}: {str(e)}")

# Global pipeline instance
processing_pipeline = ProcessingPipeline()