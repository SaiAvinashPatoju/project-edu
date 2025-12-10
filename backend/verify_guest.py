import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_guest_login():
    print("Testing Guest Login...")
    url = f"{BASE_URL}/auth/guest"
    payload = {"email": "test_guest_verify@example.com"}
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("is_guest") and "access_token" in data:
                print("SUCCESS: Guest login worked.")
                return True
            else:
                print("FAILURE: Invalid response structure.")
    except Exception as e:
        print(f"FAILURE: Request failed - {e}")
        
    return False

if __name__ == "__main__":
    if test_guest_login():
        sys.exit(0)
    else:
        sys.exit(1)
