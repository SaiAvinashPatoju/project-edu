"""
Integration tests for the complete processing pipeline.
"""
import os
import json
import tempfile
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import io

from database import Base, get_db
from main import app
from models import User, LectureSession, Slide
from services.transcription import TranscriptionService, TranscriptionResult, TranscriptionSegment
from services.content_generation import ContentGenerationService, SlideContent, SlideGenerationResult
from services.processing_pipeline import ProcessingPipeline
from services.task_manager import TaskManager, TaskStatus

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_processing.db"
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
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@university.edu",
        hashed_password="$2b$12$test_hash",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user."""
    # Mock the authentication for testing
    with patch('auth.get_current_active_user', return_value=test_user):
        return {"Authorization": "Bearer test_token"}

@pytest.fixture
def mock_audio_file():
    """Create a mock audio file for testing."""
    audio_content = b"fake_audio_data" * 1000  # Create some fake audio data
    return io.BytesIO(audio_content)

@pytest.fixture
def sample_transcription_result():
    """Sample transcription result for testing."""
    segments = [
        TranscriptionSegment(
            start=0.0,
            end=5.0,
            text="Welcome to today's lecture on machine learning.",
            confidence=0.95,
            words=[
                {"word": " Welcome", "start": 0.0, "end": 0.5, "confidence": 0.98},
                {"word": " to", "start": 0.5, "end": 0.7, "confidence": 0.99},
                {"word": " today's", "start": 0.7, "end": 1.2, "confidence": 0.95},
                {"word": " lecture", "start": 1.2, "end": 1.8, "confidence": 0.97},
                {"word": " on", "start": 1.8, "end": 2.0, "confidence": 0.99},
                {"word": " machine", "start": 2.0, "end": 2.5, "confidence": 0.96},
                {"word": " learning.", "start": 2.5, "end": 3.2, "confidence": 0.94}
            ]
        ),
        TranscriptionSegment(
            start=5.0,
            end=10.0,
            text="We will cover supervised and unsupervised learning algorithms.",
            confidence=0.92,
            words=[
                {"word": " We", "start": 5.0, "end": 5.2, "confidence": 0.98},
                {"word": " will", "start": 5.2, "end": 5.5, "confidence": 0.97},
                {"word": " cover", "start": 5.5, "end": 6.0, "confidence": 0.95},
                {"word": " supervised", "start": 6.0, "end": 6.8, "confidence": 0.65},  # Low confidence
                {"word": " and", "start": 6.8, "end": 7.0, "confidence": 0.99},
                {"word": " unsupervised", "start": 7.0, "end": 8.0, "confidence": 0.68},  # Low confidence
                {"word": " learning", "start": 8.0, "end": 8.5, "confidence": 0.94},
                {"word": " algorithms.", "start": 8.5, "end": 9.5, "confidence": 0.92}
            ]
        )
    ]
    
    return TranscriptionResult(
        text="Welcome to today's lecture on machine learning. We will cover supervised and unsupervised learning algorithms.",
        segments=segments,
        language="en",
        duration=10.0,
        low_confidence_words=["supervised", "unsupervised"]
    )

@pytest.fixture
def sample_slide_generation_result():
    """Sample slide generation result for testing."""
    slides = [
        SlideContent(
            title="Introduction to Machine Learning",
            content=[
                "Welcome to today's lecture",
                "Focus on machine learning fundamentals",
                "Interactive learning session"
            ]
        ),
        SlideContent(
            title="Learning Algorithm Types",
            content=[
                "Supervised learning algorithms",
                "Unsupervised learning methods",
                "Key differences and applications",
                "Real-world examples"
            ]
        )
    ]
    
    metadata = {
        'original_transcript_length': 108,
        'slides_generated': 2,
        'generation_model': 'gemini-pro',
        'prompt_tokens_estimate': 150,
        'response_tokens_estimate': 80
    }
    
    return SlideGenerationResult(slides=slides, metadata=metadata)

class TestTranscriptionService:
    """Test the transcription service with Moonshine ASR (transformers)."""
    
    @patch.dict(os.environ, {'USE_MOCK_TRANSCRIPTION': 'true'})
    def test_transcribe_audio_success_mock(self):
        """Test successful audio transcription with mock mode."""
        # Test transcription in mock mode (used when models not available)
        service = TranscriptionService()
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(b"fake_audio_data")
            temp_file.flush()
            temp_filename = temp_file.name
        
        try:
            result = service.transcribe_audio(temp_filename)
            
            # Check that the basic structure is correct
            assert "Welcome" in result.text
            assert "machine learning" in result.text
            assert result.language == "en"
            assert len(result.segments) >= 1
            
        finally:
            os.unlink(temp_filename)
    
    def test_transcribe_audio_file_not_found(self):
        """Test transcription with non-existent file."""
        service = TranscriptionService()
        
        with pytest.raises(FileNotFoundError):
            service.transcribe_audio("nonexistent_file.wav")
    
    def test_validate_audio_file(self):
        """Test audio file validation."""
        service = TranscriptionService()
        
        # Test with valid file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(b"fake_audio_data")
            temp_file.flush()
            temp_filename = temp_file.name
        
        try:
            assert service.validate_audio_file(temp_filename) == True
        finally:
            os.unlink(temp_filename)
        
        # Test with non-existent file
        assert service.validate_audio_file("nonexistent.wav") == False
        
        # Test with invalid extension
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
            temp_file.write(b"fake_data")
            temp_file.flush()
            temp_filename = temp_file.name
        
        try:
            assert service.validate_audio_file(temp_filename) == False
        finally:
            os.unlink(temp_filename)


class TestContentGenerationService:
    """Test the content generation service with local LLM (llama.cpp)."""
    
    def test_generate_slides_success(self, sample_slide_generation_result):
        """Test successful slide generation with mocked LLM."""
        # Mock LLM response
        mock_llm = Mock()
        mock_llm.return_value = {
            'choices': [{
                'text': json.dumps({
                    "slides": [
                        {
                            "title": "Introduction to Machine Learning",
                            "content": [
                                "Welcome to today's lecture",
                                "Focus on machine learning fundamentals",
                                "Interactive learning session"
                            ]
                        },
                        {
                            "title": "Learning Algorithm Types",
                            "content": [
                                "Supervised learning algorithms",
                                "Unsupervised learning methods",
                                "Key differences and applications"
                            ]
                        }
                    ]
                })
            }],
            'usage': {'prompt_tokens': 100, 'completion_tokens': 50}
        }
        
        with patch.object(ContentGenerationService, '_find_model_path', return_value='mock/path/model.gguf'):
            with patch.object(ContentGenerationService, '_get_llm', return_value=mock_llm):
                service = ContentGenerationService()
                transcript = "Welcome to today's lecture on machine learning. We will cover supervised and unsupervised learning algorithms."
                
                result = service.generate_slides(transcript)
                
                assert len(result.slides) == 2
                assert result.slides[0].title == "Introduction to Machine Learning"
                assert len(result.slides[0].content) == 3
                assert result.slides[1].title == "Learning Algorithm Types"
                assert len(result.slides[1].content) == 3
                assert result.metadata['slides_generated'] == 2
                assert result.metadata['teacher_faithful'] == True
    
    def test_generate_slides_short_transcript(self):
        """Test slide generation with too short transcript."""
        with patch.object(ContentGenerationService, '_find_model_path', return_value='mock/path/model.gguf'):
            with patch.object(ContentGenerationService, '_get_llm', return_value=Mock()):
                service = ContentGenerationService()
                
                with pytest.raises(ValueError, match="Transcript is too short"):
                    service.generate_slides("Short text")
    
    def test_validate_transcript(self):
        """Test transcript validation."""
        with patch.object(ContentGenerationService, '_find_model_path', return_value='mock/path/model.gguf'):
            with patch.object(ContentGenerationService, '_get_llm', return_value=Mock()):
                service = ContentGenerationService()
                
                # Valid transcript
                valid_transcript = "This is a long enough transcript for processing with multiple sentences and concepts."
                assert service.validate_transcript(valid_transcript) == True
                
                # Too short
                assert service.validate_transcript("Short") == False
                
                # Empty
                assert service.validate_transcript("") == False
                
                # None
                assert service.validate_transcript(None) == False


class TestTaskManager:
    """Test the task manager."""
    
    def test_submit_and_track_task(self):
        """Test task submission and tracking."""
        manager = TaskManager(max_workers=2)
        
        def sample_task(x, y):
            return x + y
        
        # Submit task
        task_id = manager.submit_task(sample_task, 5, 10)
        
        # Check initial status
        task_info = manager.get_task_status(task_id)
        assert task_info is not None
        assert task_info.task_id == task_id
        assert task_info.status in [TaskStatus.PENDING, TaskStatus.PROCESSING, TaskStatus.COMPLETED]
        
        # Wait for completion and check result
        import time
        max_wait = 5
        waited = 0
        while waited < max_wait:
            task_info = manager.get_task_status(task_id)
            if task_info.status == TaskStatus.COMPLETED:
                break
            time.sleep(0.1)
            waited += 0.1
        
        assert task_info.status == TaskStatus.COMPLETED
        assert task_info.result == 15
        
        manager.shutdown()
    
    def test_task_failure(self):
        """Test task failure handling."""
        manager = TaskManager(max_workers=2)
        
        def failing_task():
            raise Exception("Test error")
        
        # Submit failing task
        task_id = manager.submit_task(failing_task)
        
        # Wait for failure
        import time
        max_wait = 5
        waited = 0
        while waited < max_wait:
            task_info = manager.get_task_status(task_id)
            if task_info.status == TaskStatus.FAILED:
                break
            time.sleep(0.1)
            waited += 0.1
        
        assert task_info.status == TaskStatus.FAILED
        assert "Test error" in task_info.error
        
        manager.shutdown()

class TestProcessingPipeline:
    """Test the complete processing pipeline."""
    
    def test_pipeline_components_integration(self, sample_transcription_result, sample_slide_generation_result):
        """Test that pipeline components work together correctly."""
        # This test focuses on the core logic without database complexity
        
        # Mock the services
        with patch('services.processing_pipeline.TranscriptionService') as mock_transcription_service, \
             patch('services.processing_pipeline.ContentGenerationService') as mock_content_service:
            
            # Configure mocks
            mock_transcription_instance = Mock()
            mock_transcription_instance.transcribe_audio.return_value = sample_transcription_result
            mock_transcription_service.return_value = mock_transcription_instance
            
            mock_content_instance = Mock()
            mock_content_instance.generate_slides.return_value = sample_slide_generation_result
            mock_content_service.return_value = mock_content_instance
            
            # Create pipeline
            pipeline = ProcessingPipeline()
            
            # Test that the services are called correctly
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(b"fake_audio_data")
                temp_file.flush()
                temp_filename = temp_file.name
            
            try:
                # Mock the database operations to avoid session conflicts
                with patch.object(pipeline, '_update_session_status'), \
                     patch.object(pipeline, '_update_session_transcript'), \
                     patch.object(pipeline, '_save_slides_to_database'), \
                     patch.object(pipeline, '_cleanup_audio_file'):
                    
                    result = pipeline.process_lecture(1, temp_filename)
                    
                    # Verify the result structure
                    assert result['session_id'] == 1
                    assert result['transcript_length'] == len(sample_transcription_result.text)
                    assert result['slides_generated'] == 2
                    assert result['language'] == "en"
                    assert result['duration'] == 10.0
                    
                    # Verify services were called
                    mock_transcription_instance.transcribe_audio.assert_called_once_with(temp_filename)
                    mock_content_instance.generate_slides.assert_called_once_with(sample_transcription_result.text)
                    
            finally:
                if os.path.exists(temp_filename):
                    os.unlink(temp_filename)

class TestAPIEndpoints:
    """Test the API endpoints."""
    
    @patch('services.processing_pipeline.processing_pipeline')
    def test_process_lecture_endpoint(self, mock_pipeline, client, auth_headers, mock_audio_file):
        """Test the lecture processing endpoint."""
        mock_pipeline.submit_processing_task.return_value = "test_task_id"
        
        # Mock authentication
        with patch('auth.get_current_active_user') as mock_auth:
            mock_user = Mock()
            mock_user.id = 1
            mock_auth.return_value = mock_user
            
            # Prepare file upload
            files = {"file": ("test_audio.wav", mock_audio_file, "audio/wav")}
            data = {"title": "Test Lecture"}
            
            response = client.post(
                "/lectures/process",
                files=files,
                data=data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "session_id" in result
            assert result["task_id"] == "test_task_id"
            assert result["status"] == "pending"
    
    def test_get_processing_status(self, client, auth_headers, db_session, test_user):
        """Test getting processing status."""
        # Create test session
        session = LectureSession(
            owner_id=test_user.id,
            title="Test Lecture",
            processing_status="processing"
        )
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)
        
        with patch('auth.get_current_active_user', return_value=test_user):
            response = client.get(
                f"/lectures/{session.id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "processing"
    
    def test_get_session_with_slides(self, client, auth_headers, db_session, test_user):
        """Test getting session with slides."""
        # Create test session
        session = LectureSession(
            owner_id=test_user.id,
            title="Test Lecture",
            processing_status="completed",
            transcript="Test transcript"
        )
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)
        
        # Create test slides
        slide1 = Slide(
            session_id=session.id,
            slide_number=1,
            title="Test Slide 1",
            content=json.dumps(["Point 1", "Point 2"]),
            confidence_data=json.dumps({"low_confidence_words": []})
        )
        slide2 = Slide(
            session_id=session.id,
            slide_number=2,
            title="Test Slide 2",
            content=json.dumps(["Point 3", "Point 4"]),
            confidence_data=json.dumps({"low_confidence_words": []})
        )
        db_session.add_all([slide1, slide2])
        db_session.commit()
        
        with patch('auth.get_current_active_user', return_value=test_user):
            response = client.get(
                f"/lectures/{session.id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["session"]["id"] == session.id
            assert len(result["slides"]) == 2
            assert result["slides"][0]["title"] == "Test Slide 1"
            assert result["slides"][1]["title"] == "Test Slide 2"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])