from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lectures.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables and migrate schema if needed"""
    # checkfirst=True prevents errors when multiple workers start simultaneously
    Base.metadata.create_all(bind=engine, checkfirst=True)
    
    # Auto-migration using SQLAlchemy engine
    try:
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        
        with engine.connect() as conn:
            # Check users table
            if inspector.has_table("users"):
                columns = [col['name'] for col in inspector.get_columns("users")]
                
                if "is_guest" not in columns:
                    print("Migrating: Adding is_guest to users")
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT 0"))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to add is_guest: {e}")
                        
                if "guest_expires_at" not in columns:
                    print("Migrating: Adding guest_expires_at to users")
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN guest_expires_at DATETIME"))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to add guest_expires_at: {e}")

            # Check slides table
            if inspector.has_table("slides"):
                columns = [col['name'] for col in inspector.get_columns("slides")]
                if "image_url" not in columns:
                    print("Migrating: Adding image_url to slides")
                    try:
                        conn.execute(text("ALTER TABLE slides ADD COLUMN image_url VARCHAR"))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to add image_url: {e}")

            # Check lecture_sessions table
            if inspector.has_table("lecture_sessions"):
                columns = [col['name'] for col in inspector.get_columns("lecture_sessions")]
                if "daily_session_id" not in columns:
                    print("Migrating: Adding daily_session_id to lecture_sessions")
                    try:
                        conn.execute(text("ALTER TABLE lecture_sessions ADD COLUMN daily_session_id INTEGER REFERENCES daily_sessions(id)"))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to add daily_session_id: {e}")
                        
    except Exception as e:
        print(f"Migration warning (SQLAlchemy): {e}")

    # Fallback: Raw SQLite migration (most robust for local dev)
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Check users
                try:
                    cursor.execute("SELECT is_guest FROM users LIMIT 1")
                except sqlite3.OperationalError:
                    print("Raw SQLite: Adding is_guest to users")
                    cursor.execute("ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT 0")
                
                try:
                    cursor.execute("SELECT guest_expires_at FROM users LIMIT 1")
                except sqlite3.OperationalError:
                    print("Raw SQLite: Adding guest_expires_at to users")
                    cursor.execute("ALTER TABLE users ADD COLUMN guest_expires_at DATETIME")
                
                # Check slides
                try:
                    cursor.execute("SELECT image_url FROM slides LIMIT 1")
                except sqlite3.OperationalError:
                    print("Raw SQLite: Adding image_url to slides")
                    cursor.execute("ALTER TABLE slides ADD COLUMN image_url VARCHAR")
                    
                conn.commit()
                conn.close()
                print("Raw SQLite migration checks completed")
    except Exception as e:
        print(f"Migration warning (Raw SQLite): {e}")