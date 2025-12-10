import sqlite3
import os

DB_PATH = "lectures.db"

if not os.path.exists(DB_PATH):
    print(f"Database file {DB_PATH} not found.")
else:
    print(f"Checking schema of {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check users table columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Users table columns: {columns}")
    
    if "is_guest" not in columns:
        print("MISSING is_guest column!")
    else:
        print("is_guest column exists.")
        
    if "guest_expires_at" not in columns:
        print("MISSING guest_expires_at column!")
    else:
        print("guest_expires_at column exists.")

    # Check daily_sessions table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_sessions'")
    if cursor.fetchone():
        print("daily_sessions table exists.")
    else:
        print("MISSING daily_sessions table!")

    conn.close()
