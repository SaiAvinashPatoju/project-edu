import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models import User, LectureSession, Slide

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_integration.db"
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
    # Ensure all models are imported and create tables
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    # Clean up
    Base.metadata.drop_all(bind=engine)

def test_complete_authentication_integration(client):
    """Test the complete authentication integration flow"""
    
    # 1. Test root endpoint
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Lecture to Slides API"}
    
    # 2. Test registration with valid .edu email
    register_data = {
        "email": "professor@university.edu",
        "password": "securepassword123"
    }
    
    register_response = client.post("/auth/register", json=register_data)
    assert register_response.status_code == 200
    
    register_result = register_response.json()
    assert "access_token" in register_result
    assert register_result["token_type"] == "bearer"
    
    registration_token = register_result["access_token"]
    
    # 3. Test accessing protected endpoint with registration token
    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {registration_token}"}
    )
    assert me_response.status_code == 200
    
    user_data = me_response.json()
    assert user_data["email"] == "professor@university.edu"
    assert user_data["is_active"] is True
    assert "id" in user_data
    assert "created_at" in user_data
    
    # 4. Test login with same credentials
    login_data = {
        "username": "professor@university.edu",
        "password": "securepassword123"
    }
    
    login_response = client.post("/auth/token", data=login_data)
    assert login_response.status_code == 200
    
    login_result = login_response.json()
    assert "access_token" in login_result
    assert login_result["token_type"] == "bearer"
    
    login_token = login_result["access_token"]
    
    # 5. Test accessing protected endpoint with login token
    me_response2 = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {login_token}"}
    )
    assert me_response2.status_code == 200
    
    user_data2 = me_response2.json()
    assert user_data2["email"] == "professor@university.edu"
    assert user_data2["id"] == user_data["id"]  # Same user
    
    # 6. Test invalid token
    invalid_response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert invalid_response.status_code == 401
    
    # 7. Test no token
    no_token_response = client.get("/auth/me")
    assert no_token_response.status_code == 401
    
    # 8. Test registration with invalid email
    invalid_register_data = {
        "email": "invalid@gmail.com",
        "password": "password123"
    }
    
    invalid_register_response = client.post("/auth/register", json=invalid_register_data)
    assert invalid_register_response.status_code == 400
    assert "Email must be from a .edu domain" in invalid_register_response.json()["detail"]
    
    # 9. Test duplicate registration
    duplicate_response = client.post("/auth/register", json=register_data)
    assert duplicate_response.status_code == 400
    assert "Email already registered" in duplicate_response.json()["detail"]
    
    # 10. Test login with wrong password
    wrong_password_data = {
        "username": "professor@university.edu",
        "password": "wrongpassword"
    }
    
    wrong_password_response = client.post("/auth/token", data=wrong_password_data)
    assert wrong_password_response.status_code == 401
    assert "Incorrect email or password" in wrong_password_response.json()["detail"]

if __name__ == "__main__":
    pytest.main([__file__])