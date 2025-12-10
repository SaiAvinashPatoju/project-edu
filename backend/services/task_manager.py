"""
Background task manager for asynchronous processing using concurrent.futures.
"""
import os
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Dict, Optional, Callable, Any
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import threading

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Task execution status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class TaskInfo:
    """Information about a background task."""
    task_id: str
    status: TaskStatus
    progress: Optional[int] = None
    error: Optional[str] = None
    result: Optional[Any] = None
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

class TaskManager:
    """Manages background tasks using ThreadPoolExecutor."""
    
    def __init__(self, max_workers: int = 4):
        """
        Initialize the task manager.
        
        Args:
            max_workers: Maximum number of concurrent worker threads
        """
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.tasks: Dict[str, TaskInfo] = {}
        self.futures: Dict[str, Future] = {}
        self._lock = threading.Lock()
        
        logger.info(f"TaskManager initialized with {max_workers} workers")
    
    def submit_task(self, func: Callable, *args, **kwargs) -> str:
        """
        Submit a task for background execution.
        
        Args:
            func: Function to execute
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function
            
        Returns:
            Task ID for tracking the task
        """
        task_id = str(uuid.uuid4())
        
        with self._lock:
            # Create task info
            task_info = TaskInfo(
                task_id=task_id,
                status=TaskStatus.PENDING
            )
            self.tasks[task_id] = task_info
            
            # Submit to executor
            future = self.executor.submit(self._execute_task, task_id, func, *args, **kwargs)
            self.futures[task_id] = future
        
        logger.info(f"Task {task_id} submitted for execution")
        return task_id
    
    def get_task_status(self, task_id: str) -> Optional[TaskInfo]:
        """
        Get the current status of a task.
        
        Args:
            task_id: ID of the task to check
            
        Returns:
            TaskInfo object or None if task not found
        """
        with self._lock:
            return self.tasks.get(task_id)
    
    def update_task_progress(self, task_id: str, progress: int):
        """
        Update the progress of a running task.
        
        Args:
            task_id: ID of the task
            progress: Progress percentage (0-100)
        """
        with self._lock:
            if task_id in self.tasks:
                self.tasks[task_id].progress = progress
                logger.debug(f"Task {task_id} progress updated to {progress}%")
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Attempt to cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if task was cancelled, False otherwise
        """
        with self._lock:
            if task_id in self.futures:
                future = self.futures[task_id]
                if future.cancel():
                    self.tasks[task_id].status = TaskStatus.FAILED
                    self.tasks[task_id].error = "Task cancelled"
                    self.tasks[task_id].completed_at = datetime.utcnow()
                    logger.info(f"Task {task_id} cancelled")
                    return True
        
        return False
    
    def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """
        Clean up completed tasks older than specified age.
        
        Args:
            max_age_hours: Maximum age in hours for keeping completed tasks
        """
        cutoff_time = datetime.utcnow().timestamp() - (max_age_hours * 3600)
        
        with self._lock:
            tasks_to_remove = []
            
            for task_id, task_info in self.tasks.items():
                if (task_info.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and
                    task_info.completed_at and
                    task_info.completed_at.timestamp() < cutoff_time):
                    tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self.tasks[task_id]
                if task_id in self.futures:
                    del self.futures[task_id]
            
            if tasks_to_remove:
                logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")
    
    def get_all_tasks(self) -> Dict[str, TaskInfo]:
        """Get all current tasks."""
        with self._lock:
            return self.tasks.copy()
    
    def shutdown(self, wait: bool = True):
        """
        Shutdown the task manager.
        
        Args:
            wait: Whether to wait for running tasks to complete
        """
        logger.info("Shutting down TaskManager")
        self.executor.shutdown(wait=wait)
    
    def _execute_task(self, task_id: str, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a task and update its status.
        
        Args:
            task_id: ID of the task
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Result of the function execution
        """
        try:
            # Update status to processing
            with self._lock:
                if task_id in self.tasks:
                    self.tasks[task_id].status = TaskStatus.PROCESSING
                    self.tasks[task_id].started_at = datetime.utcnow()
            
            logger.info(f"Starting execution of task {task_id}")
            
            # Execute the function
            result = func(*args, **kwargs)
            
            # Update status to completed
            with self._lock:
                if task_id in self.tasks:
                    self.tasks[task_id].status = TaskStatus.COMPLETED
                    self.tasks[task_id].result = result
                    self.tasks[task_id].progress = 100
                    self.tasks[task_id].completed_at = datetime.utcnow()
            
            logger.info(f"Task {task_id} completed successfully")
            return result
            
        except Exception as e:
            # Update status to failed
            error_msg = str(e)
            with self._lock:
                if task_id in self.tasks:
                    self.tasks[task_id].status = TaskStatus.FAILED
                    self.tasks[task_id].error = error_msg
                    self.tasks[task_id].completed_at = datetime.utcnow()
            
            logger.error(f"Task {task_id} failed: {error_msg}")
            raise

# Global task manager instance
task_manager = TaskManager(max_workers=int(os.getenv("BACKGROUND_TASK_WORKERS", "4")))