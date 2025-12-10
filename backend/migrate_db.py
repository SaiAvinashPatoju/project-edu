import sqlite3
import os

DB_PATH = "lectures.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database file {DB_PATH} not found. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check users table columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    
    try:
        if "is_guest" not in columns:
            print("Adding is_guest column...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT 0")
            
        if "guest_expires_at" not in columns:
            print("Adding guest_expires_at column...")
            cursor.execute("ALTER TABLE users ADD COLUMN guest_expires_at DATETIME")
            
        # Check daily_sessions table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_sessions'")
        if not cursor.fetchone():
            print("Creating daily_sessions table...")
            # We'll let sqlalchemy create this one by running the app, or we can create it here.
            # But simpler to just add columns to users so login works.
            # daily_sessions will be created by init_db() if we fix the user table first, 
            # actually init_db only runs create_all, which checks per table. 
            # So if daily_sessions is missing, init_db WILL create it. 
            # The problem is usually modifying existing tables.
            pass

        # Check slides table for image_url
        cursor.execute("PRAGMA table_info(slides)")
        slide_columns = [row[1] for row in cursor.fetchall()]
        if "image_url" not in slide_columns:
             print("Adding image_url column to slides...")
             cursor.execute("ALTER TABLE slides ADD COLUMN image_url VARCHAR")

        # Check lecture_sessions table for daily_session_id
        cursor.execute("PRAGMA table_info(lecture_sessions)")
        ls_columns = [row[1] for row in cursor.fetchall()]
        if "daily_session_id" not in ls_columns:
            print("Adding daily_session_id column to lecture_sessions...")
            cursor.execute("ALTER TABLE lecture_sessions ADD COLUMN daily_session_id INTEGER REFERENCES daily_sessions(id)")

        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
