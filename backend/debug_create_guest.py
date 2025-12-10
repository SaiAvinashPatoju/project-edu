import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from database import init_db, get_db
from auth import create_guest_user
from sqlalchemy.orm import Session
import traceback

def test_guest_creation():
    print("Initializing DB...")
    try:
        init_db()
        print("DB initialized.")
    except Exception as e:
        print(f"DB Init Failed: {e}")
        traceback.print_exc()
        return

    db = next(get_db())
    email = "test.guest@example.com"
    
    print(f"Attempting to create guest user: {email}")
    try:
        user = create_guest_user(db, email)
        print(f"Guest user created successfully: ID={user.id}, IsGuest={user.is_guest}")
    except Exception as e:
        print("FAILED to create guest user.")
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_guest_creation()
