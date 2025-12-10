"""
Simple API integration test to verify endpoints are working.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test that the root endpoint works."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Lecture to Slides API"}

def test_processing_endpoints_exist():
    """Test that processing endpoints exist (will return 401 without auth)."""
    
    # Test lecture processing endpoint exists
    response = client.post("/lectures/process")
    assert response.status_code in [401, 422]  # 401 unauthorized or 422 validation error
    
    # Test status endpoint exists
    response = client.get("/lectures/1/status")
    assert response.status_code == 401  # Unauthorized without token
    
    # Test sessions endpoint exists
    response = client.get("/lectures/sessions")
    assert response.status_code == 401  # Unauthorized without token
    
    # Test session with slides endpoint exists
    response = client.get("/lectures/1")
    assert response.status_code == 401  # Unauthorized without token

def test_slide_update_endpoint_exists():
    """Test that slide update endpoint exists."""
    response = client.put("/slides/1", json={"title": "Test"})
    assert response.status_code == 401  # Unauthorized without token

if __name__ == "__main__":
    pytest.main([__file__, "-v"])