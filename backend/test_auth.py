import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models import User, LectureSession, Slide
from auth import get_password_hash, verify_password, validate_edu_email, create_access_token
import os

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
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

class TestPasswordHashing:
    def test_password_hashing(self):
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

class TestEmailValidation:
    def test_valid_edu_emails(self):
        valid_emails = [
            "student@university.edu",
            "professor@college.edu",
            "admin@school.edu",
            "test.user@my-university.edu"
        ]
        
        for email in valid_emails:
            assert validate_edu_email(email) is True

    def test_invalid_emails(self):
        invalid_emails = [
            "user@gmail.com",
            "student@university.com",
            "test@school.org",
            "invalid-email",
            "@university.edu",
            "user@.edu"
        ]
        
        for email in invalid_emails:
            assert validate_edu_email(email) is False

class TestJWTTokens:
    def test_create_access_token(self):
        data = {"sub": "test@university.edu"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

class TestAuthEndpoints:
    def test_register_valid_user(self, client):
        response = client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_invalid_email(self, client):
        response = client.post(
            "/auth/register",
            json={"email": "test@gmail.com", "password": "testpass123"}
        )
        
        assert response.status_code == 400
        assert "Email must be from a .edu domain" in response.json()["detail"]

    def test_register_duplicate_email(self, client):
        # Register first user
        client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass123"}
        )
        
        # Try to register same email again
        response = client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass456"}
        )
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_login_valid_credentials(self, client):
        # Register user first
        client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass123"}
        )
        
        # Login
        response = client.post(
            "/auth/token",
            data={"username": "test@university.edu", "password": "testpass123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client):
        # Register user first
        client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass123"}
        )
        
        # Try login with wrong password
        response = client.post(
            "/auth/token",
            data={"username": "test@university.edu", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/auth/token",
            data={"username": "nonexistent@university.edu", "password": "testpass123"}
        )
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_get_current_user(self, client):
        # Register and login
        register_response = client.post(
            "/auth/register",
            json={"email": "test@university.edu", "password": "testpass123"}
        )
        token = register_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@university.edu"
        assert data["is_active"] is True

    def test_get_current_user_invalid_token(self, client):
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_get_current_user_no_token(self, client):
        response = client.get("/auth/me")
        
        assert response.status_code == 401

class TestAuthFlow:
    def test_complete_auth_flow(self, client):
        """Test complete registration -> login -> protected route flow"""
        email = "student@university.edu"
        password = "securepassword123"
        
        # 1. Register
        register_response = client.post(
            "/auth/register",
            json={"email": email, "password": password}
        )
        assert register_response.status_code == 200
        register_token = register_response.json()["access_token"]
        
        # 2. Verify we can access protected route with registration token
        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {register_token}"}
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == email
        
        # 3. Login separately
        login_response = client.post(
            "/auth/token",
            data={"username": email, "password": password}
        )
        assert login_response.status_code == 200
        login_token = login_response.json()["access_token"]
        
        # 4. Verify we can access protected route with login token
        me_response2 = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {login_token}"}
        )
        assert me_response2.status_code == 200
        assert me_response2.json()["email"] == email

if __name__ == "__main__":
    pytest.main([__file__])