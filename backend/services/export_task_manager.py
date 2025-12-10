"""
Export task manager for handling asynchronous export job processing
"""
import os
import uuid
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any
from sqlalchemy.orm import Session

from database import get_db
from models import ExportJob, LectureSession, Slide
from services.export_service import export_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExportTaskManager:
    """Manages asynchronous export job processing"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)  # Limit concurrent exports
        self.active_tasks: Dict[str, Any] = {}
    
    def submit_export_task(self, export_job_id: int) -> str:
        """
        Submit an export job for background processing
        
        Args:
            export_job_id: ID of the export job to process
            
        Returns:
            str: Task ID for tracking
        """
        task_id = str(uuid.uuid4())
        
        # Submit task to executor
        future = self.executor.submit(self._process_export_job, export_job_id)
        
        # Store task reference
        self.active_tasks[task_id] = {
            'future': future,
            'export_job_id': export_job_id,
            'started_at': datetime.utcnow()
        }
        
        logger.info(f"Submitted export task {task_id} for export job {export_job_id}")
        return task_id
    
    def _process_export_job(self, export_job_id: int):
        """
        Process an export job in the background
        
        Args:
            export_job_id: ID of the export job to process
        """
        db = next(get_db())
        
        try:
            # Get export job
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if not export_job:
                logger.error(f"Export job {export_job_id} not found")
                return
            
            # Update status to processing
            export_job.status = "processing"
            db.commit()
            
            logger.info(f"Processing export job {export_job_id} - format: {export_job.export_format}")
            
            # Get session and slides
            session = db.query(LectureSession).filter(
                LectureSession.id == export_job.session_id
            ).first()
            
            if not session:
                raise Exception(f"Session {export_job.session_id} not found")
            
            slides = db.query(Slide).filter(
                Slide.session_id == export_job.session_id
            ).order_by(Slide.slide_number).all()
            
            if not slides:
                raise Exception(f"No slides found for session {export_job.session_id}")
            
            # Generate file based on format
            if export_job.export_format == "pdf":
                file_path = export_service.generate_pdf(slides, session)
            elif export_job.export_format == "pptx":
                file_path = export_service.generate_pptx(slides, session)
            else:
                raise Exception(f"Unsupported export format: {export_job.export_format}")
            
            # Update export job with success
            export_job.status = "completed"
            export_job.file_path = file_path
            export_job.download_url = f"/exports/download/{export_job.id}"
            export_job.expires_at = datetime.utcnow() + timedelta(days=7)  # Files expire in 7 days
            export_job.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"Export job {export_job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Export job {export_job_id} failed: {str(e)}")
            
            # Update export job with failure
            export_job.status = "failed"
            export_job.error_message = str(e)
            export_job.updated_at = datetime.utcnow()
            db.commit()
            
        finally:
            db.close()
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the status of a background task
        
        Args:
            task_id: Task ID to check
            
        Returns:
            dict: Task status information
        """
        if task_id not in self.active_tasks:
            return {"status": "not_found"}
        
        task_info = self.active_tasks[task_id]
        future = task_info['future']
        
        if future.done():
            # Task completed, clean up
            del self.active_tasks[task_id]
            
            if future.exception():
                return {
                    "status": "failed",
                    "error": str(future.exception())
                }
            else:
                return {"status": "completed"}
        else:
            return {"status": "processing"}
    
    def cleanup_expired_files(self):
        """Clean up expired export files"""
        db = next(get_db())
        
        try:
            # Find expired export jobs
            expired_jobs = db.query(ExportJob).filter(
                ExportJob.status == "completed",
                ExportJob.expires_at < datetime.utcnow()
            ).all()
            
            for job in expired_jobs:
                if job.file_path and os.path.exists(job.file_path):
                    try:
                        os.remove(job.file_path)
                        logger.info(f"Cleaned up expired file: {job.file_path}")
                    except Exception as e:
                        logger.error(f"Failed to clean up file {job.file_path}: {e}")
                
                # Update job status
                job.status = "expired"
                job.file_path = None
                job.download_url = None
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        finally:
            db.close()


# Global instance
export_task_manager = ExportTaskManager()