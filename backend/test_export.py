"""
Tests for export functionality
"""
import pytest
import os
import tempfile
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db, Base
from models import User, LectureSession, Slide, ExportJob
from auth import create_access_token

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_export.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def setup_database():
    """Create test database and tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)

@pytest.fixture
def test_user():
    """Create a test user"""
    db = TestingSessionLocal()
    user = User(
        email="test@university.edu",
        hashed_password="$2b$12$test_hash",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers"""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_session_with_slides(test_user):
    """Create a test session with slides"""
    db = TestingSessionLocal()
    
    # Create session
    session = LectureSession(
        owner_id=test_user.id,
        title="Test Lecture",
        transcript="This is a test transcript",
        audio_duration=300,
        processing_status="completed"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create slides
    slides_data = [
        {
            "slide_number": 1,
            "title": "Introduction",
            "content": json.dumps(["Welcome to the lecture", "Today we will cover", "Key concepts"])
        },
        {
            "slide_number": 2,
            "title": "Main Content",
            "content": json.dumps(["First point", "Second point", "Third point"])
        }
    ]
    
    slides = []
    for slide_data in slides_data:
        slide = Slide(
            session_id=session.id,
            **slide_data
        )
        db.add(slide)
        slides.append(slide)
    
    db.commit()
    for slide in slides:
        db.refresh(slide)
    
    # Create simple objects with the data we need (avoiding SQLAlchemy session issues)
    class MockSession:
        def __init__(self, id, title):
            self.id = id
            self.title = title
    
    class MockSlide:
        def __init__(self, id, slide_number, title, content):
            self.id = id
            self.slide_number = slide_number
            self.title = title
            self.content = content
    
    mock_session = MockSession(session.id, session.title)
    mock_slides = [MockSlide(slide.id, slide.slide_number, slide.title, slide.content) for slide in slides]
    
    db.close()
    return mock_session, mock_slides

class TestExportAPI:
    """Test export API endpoints"""
    
    def test_start_export_pdf(self, setup_database, client, auth_headers, test_session_with_slides):
        """Test starting a PDF export"""
        session, slides = test_session_with_slides
        
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "pdf"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "export_id" in data
        assert data["status"] == "pending"
        assert "pdf" in data["message"].lower()
    
    def test_start_export_pptx(self, setup_database, client, auth_headers, test_session_with_slides):
        """Test starting a PPTX export"""
        session, slides = test_session_with_slides
        
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "pptx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "export_id" in data
        assert data["status"] == "pending"
        assert "pptx" in data["message"].lower()
    
    def test_start_export_invalid_format(self, setup_database, client, auth_headers, test_session_with_slides):
        """Test starting export with invalid format"""
        session, slides = test_session_with_slides
        
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "invalid"},
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid export format" in response.json()["detail"]
    
    def test_start_export_nonexistent_session(self, setup_database, client, auth_headers):
        """Test starting export for nonexistent session"""
        response = client.post(
            "/slides/999/export",
            json={"format": "pdf"},
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_start_export_incomplete_session(self, setup_database, client, auth_headers, test_user):
        """Test starting export for incomplete session"""
        db = TestingSessionLocal()
        
        # Create incomplete session
        session = LectureSession(
            owner_id=test_user.id,
            title="Incomplete Lecture",
            processing_status="processing"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        db.close()
        
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "pdf"},
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not ready" in response.json()["detail"].lower()
    
    def test_get_export_status(self, setup_database, client, auth_headers, test_session_with_slides):
        """Test getting export status"""
        session, slides = test_session_with_slides
        
        # Start export first
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "pdf"},
            headers=auth_headers
        )
        export_id = response.json()["export_id"]
        
        # Get status
        response = client.get(
            f"/slides/export/{export_id}/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["pending", "processing", "completed", "failed"]
    
    def test_get_export_status_nonexistent(self, setup_database, client, auth_headers):
        """Test getting status for nonexistent export"""
        response = client.get(
            "/slides/export/999/status",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_unauthorized_access(self, setup_database, client, test_session_with_slides):
        """Test unauthorized access to export endpoints"""
        session, slides = test_session_with_slides
        
        # No auth headers
        response = client.post(
            f"/slides/{session.id}/export",
            json={"format": "pdf"}
        )
        assert response.status_code == 401
        
        response = client.get("/slides/export/1/status")
        assert response.status_code == 401
        
        response = client.get("/exports/download/1")
        assert response.status_code == 401


class TestExportService:
    """Test export service functionality"""
    
    def test_pdf_generation(self, setup_database, test_session_with_slides):
        """Test PDF file generation"""
        from services.export_service import export_service
        
        session, slides = test_session_with_slides
        
        # Generate PDF
        pdf_path = export_service.generate_pdf(slides, session)
        
        # Verify file exists and has content
        assert os.path.exists(pdf_path)
        assert os.path.getsize(pdf_path) > 0
        assert pdf_path.endswith('.pdf')
        
        # Cleanup
        export_service.cleanup_file(pdf_path)
    
    def test_pptx_generation(self, setup_database, test_session_with_slides):
        """Test PPTX file generation"""
        from services.export_service import export_service
        
        session, slides = test_session_with_slides
        
        # Generate PPTX
        pptx_path = export_service.generate_pptx(slides, session)
        
        # Verify file exists and has content
        assert os.path.exists(pptx_path)
        assert os.path.getsize(pptx_path) > 0
        assert pptx_path.endswith('.pptx')
        
        # Cleanup
        export_service.cleanup_file(pptx_path)
    
    def test_cleanup_file(self, setup_database):
        """Test file cleanup functionality"""
        from services.export_service import export_service
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test content")
            tmp_path = tmp.name
        
        # Verify file exists
        assert os.path.exists(tmp_path)
        
        # Cleanup
        result = export_service.cleanup_file(tmp_path)
        assert result is True
        assert not os.path.exists(tmp_path)
        
        # Test cleanup of nonexistent file
        result = export_service.cleanup_file(tmp_path)
        assert result is False


class TestExportTaskManager:
    """Test export task manager"""
    
    def test_submit_export_task(self, setup_database, test_session_with_slides):
        """Test submitting an export task"""
        from services.export_task_manager import export_task_manager
        
        session, slides = test_session_with_slides
        
        # Create export job
        db = TestingSessionLocal()
        export_job = ExportJob(
            session_id=session.id,
            user_id=session.owner_id,
            export_format="pdf",
            status="pending"
        )
        db.add(export_job)
        db.commit()
        db.refresh(export_job)
        db.close()
        
        # Submit task
        task_id = export_task_manager.submit_export_task(export_job.id)
        
        assert task_id is not None
        assert isinstance(task_id, str)
        
        # Check task status
        status = export_task_manager.get_task_status(task_id)
        assert status["status"] in ["processing", "completed", "failed"]


if __name__ == "__main__":
    pytest.main([__file__])