import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models import User, LectureSession, Slide
from auth import get_password_hash
import json

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_content_management.db"
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
def client():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    # Drop tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_user_and_session(client):
    """Create a test user with a completed lecture session and slides"""
    db = TestingSessionLocal()
    
    # Create user
    user = User(
        email="test@university.edu",
        hashed_password=get_password_hash("testpassword")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create lecture session
    session = LectureSession(
        owner_id=user.id,
        title="Test Lecture Session",
        transcript="This is a test transcript with some content.",
        audio_duration=1800,  # 30 minutes
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
            "content": json.dumps(["Welcome to the lecture", "Today we will cover key concepts"]),
            "confidence_data": json.dumps({"low_confidence_words": ["lecture"]})
        },
        {
            "slide_number": 2,
            "title": "Main Content",
            "content": json.dumps(["First point", "Second point", "Third point"]),
            "confidence_data": json.dumps({"low_confidence_words": []})
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
    
    db.close()
    
    return {
        "user": {"id": user.id, "email": user.email},
        "session": {"id": session.id, "title": session.title},
        "slides": [{"id": slide.id, "slide_number": slide.slide_number, "title": slide.title} for slide in slides]
    }

def get_auth_token(client, email="test@university.edu", password="testpassword"):
    """Helper to get authentication token"""
    response = client.post("/auth/token", data={
        "username": email,
        "password": password
    })
    assert response.status_code == 200
    return response.json()["access_token"]

def test_get_user_sessions(client, test_user_and_session):
    """Test fetching user's lecture sessions"""
    token = get_auth_token(client)
    
    response = client.get("/lectures/sessions", headers={
        "Authorization": f"Bearer {token}"
    })
    
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) == 1
    assert sessions[0]["title"] == "Test Lecture Session"
    assert sessions[0]["processing_status"] == "completed"

def test_get_session_with_slides(client, test_user_and_session):
    """Test fetching a specific session with its slides"""
    token = get_auth_token(client)
    session_id = test_user_and_session["session"]["id"]
    
    response = client.get(f"/lectures/{session_id}", headers={
        "Authorization": f"Bearer {token}"
    })
    
    assert response.status_code == 200
    data = response.json()
    
    # Check session data
    assert data["session"]["title"] == "Test Lecture Session"
    assert data["session"]["processing_status"] == "completed"
    
    # Check slides data
    assert len(data["slides"]) == 2
    assert data["slides"][0]["title"] == "Introduction"
    assert data["slides"][1]["title"] == "Main Content"
    
    # Check slide content
    intro_content = json.loads(data["slides"][0]["content"])
    assert "Welcome to the lecture" in intro_content

def test_update_slide_title_and_content(client, test_user_and_session):
    """Test updating a slide's title and content"""
    token = get_auth_token(client)
    slide_id = test_user_and_session["slides"][0]["id"]
    
    update_data = {
        "title": "Updated Introduction",
        "content": json.dumps(["Updated welcome message", "New agenda item"])
    }
    
    response = client.put(f"/slides/{slide_id}", 
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    
    assert response.status_code == 200
    updated_slide = response.json()
    
    assert updated_slide["title"] == "Updated Introduction"
    assert json.loads(updated_slide["content"]) == ["Updated welcome message", "New agenda item"]

def test_update_slide_title_only(client, test_user_and_session):
    """Test updating only a slide's title"""
    token = get_auth_token(client)
    slide_id = test_user_and_session["slides"][0]["id"]
    
    update_data = {
        "title": "New Title Only"
    }
    
    response = client.put(f"/slides/{slide_id}", 
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    
    assert response.status_code == 200
    updated_slide = response.json()
    
    assert updated_slide["title"] == "New Title Only"
    # Content should remain unchanged
    original_content = json.loads(updated_slide["content"])
    assert "Welcome to the lecture" in original_content

def test_update_slide_content_only(client, test_user_and_session):
    """Test updating only a slide's content"""
    token = get_auth_token(client)
    slide_id = test_user_and_session["slides"][0]["id"]
    
    update_data = {
        "content": json.dumps(["Only content updated", "Title stays the same"])
    }
    
    response = client.put(f"/slides/{slide_id}", 
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    
    assert response.status_code == 200
    updated_slide = response.json()
    
    assert updated_slide["title"] == "Introduction"  # Original title
    assert json.loads(updated_slide["content"]) == ["Only content updated", "Title stays the same"]

def test_update_nonexistent_slide(client, test_user_and_session):
    """Test updating a slide that doesn't exist"""
    token = get_auth_token(client)
    
    update_data = {
        "title": "This should fail"
    }
    
    response = client.put("/slides/99999", 
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    
    assert response.status_code == 404

def test_update_slide_unauthorized(client, test_user_and_session):
    """Test updating a slide without authentication"""
    slide_id = test_user_and_session["slides"][0]["id"]
    
    update_data = {
        "title": "Unauthorized update"
    }
    
    response = client.put(f"/slides/{slide_id}", json=update_data)
    
    assert response.status_code == 401

def test_get_session_not_completed(client, test_user_and_session):
    """Test fetching a session that's not completed yet"""
    # Create a processing session
    db = TestingSessionLocal()
    user_id = test_user_and_session["user"]["id"]
    
    processing_session = LectureSession(
        owner_id=user_id,
        title="Processing Session",
        processing_status="processing"
    )
    db.add(processing_session)
    db.commit()
    db.refresh(processing_session)
    db.close()
    
    token = get_auth_token(client)
    
    response = client.get(f"/lectures/{processing_session.id}", headers={
        "Authorization": f"Bearer {token}"
    })
    
    assert response.status_code == 400
    assert "not ready" in response.json()["detail"].lower()

def test_get_session_unauthorized_user(client, test_user_and_session):
    """Test fetching a session that belongs to another user"""
    # Create another user
    db = TestingSessionLocal()
    other_user = User(
        email="other@university.edu",
        hashed_password=get_password_hash("otherpassword")
    )
    db.add(other_user)
    db.commit()
    db.close()
    
    # Try to access the session with the other user's token
    other_token = get_auth_token(client, "other@university.edu", "otherpassword")
    session_id = test_user_and_session["session"]["id"]
    
    response = client.get(f"/lectures/{session_id}", headers={
        "Authorization": f"Bearer {other_token}"
    })
    
    assert response.status_code == 404

def test_complete_content_management_workflow(client, test_user_and_session):
    """Test the complete workflow: list sessions -> get session -> update slides"""
    token = get_auth_token(client)
    
    # 1. List sessions
    sessions_response = client.get("/lectures/sessions", headers={
        "Authorization": f"Bearer {token}"
    })
    assert sessions_response.status_code == 200
    sessions = sessions_response.json()
    assert len(sessions) == 1
    
    session_id = sessions[0]["id"]
    
    # 2. Get session with slides
    session_response = client.get(f"/lectures/{session_id}", headers={
        "Authorization": f"Bearer {token}"
    })
    assert session_response.status_code == 200
    session_data = session_response.json()
    
    slides = session_data["slides"]
    assert len(slides) == 2
    
    # 3. Update first slide
    first_slide_id = slides[0]["id"]
    update_response = client.put(f"/slides/{first_slide_id}", 
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Workflow Test Title",
            "content": json.dumps(["Workflow test content"])
        }
    )
    assert update_response.status_code == 200
    
    # 4. Verify the update by fetching the session again
    verify_response = client.get(f"/lectures/{session_id}", headers={
        "Authorization": f"Bearer {token}"
    })
    assert verify_response.status_code == 200
    updated_session_data = verify_response.json()
    
    updated_slide = updated_session_data["slides"][0]
    assert updated_slide["title"] == "Workflow Test Title"
    assert json.loads(updated_slide["content"]) == ["Workflow test content"]