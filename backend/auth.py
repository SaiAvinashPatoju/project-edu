from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
import re
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme - optional for guest endpoints
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=True)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
GUEST_TOKEN_EXPIRE_MINUTES = 10  # Fixed 10-minute expiry for guests

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def validate_edu_email(email: str) -> bool:
    """Validate that email ends with .edu domain"""
    edu_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$'
    return bool(re.match(edu_pattern, email))

def validate_email_format(email: str) -> bool:
    """Validate basic email format for guest users (any domain)"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_guest_access_token(data: dict):
    """Create JWT access token for guest users with fixed 10-minute expiry"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "is_guest": True})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if user.is_guest:
        return None  # Guests cannot use password login
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_user(db: Session, email: str, password: str) -> User:
    """Create a new user"""
    if not validate_edu_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from a .edu domain"
        )
    
    # Check if user already exists
    if get_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(password)
    db_user = User(email=email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_guest_user(db: Session, email: str) -> User:
    """Create a temporary guest user with 10-minute expiry"""
    print(f"DEBUG: create_guest_user called for {email}")
    try:
        if not validate_email_format(email):
            print("DEBUG: Invalid email format")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid email address"
            )
        
        # Check if email is already used by a regular user
        print("DEBUG: Checking existing user")
        existing_user = get_user_by_email(db, email)
        if existing_user:
            print(f"DEBUG: Found existing user. Is Guest: {existing_user.is_guest}")
            if not existing_user.is_guest:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is registered. Please sign in instead."
                )
        
        # If existing guest user, update expiry
        if existing_user and existing_user.is_guest:
            print("DEBUG: Updating existing guest expiry")
            existing_user.guest_expires_at = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
            db.commit()
            db.refresh(existing_user)
            return existing_user
        
        # Create new guest user with random password (won't be used)
        print("DEBUG: Creating new guest user")
        guest_expires = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
        random_password = get_password_hash(str(uuid.uuid4()))
        
        db_user = User(
            email=email,
            hashed_password=random_password,
            is_guest=True,
            guest_expires_at=guest_expires
        )
        print("DEBUG: Adding user to session")
        db.add(db_user)
        print("DEBUG: Committing session")
        db.commit()
        print("DEBUG: Refreshing user")
        db.refresh(db_user)
        print("DEBUG: Guest user created successfully")
        return db_user
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error creating guest user: {e}")
        db.rollback()
        
        # Self-healing: Try to migrate DB and retry if column is missing
        if "no such column" in str(e).lower():
            try:
                print("DEBUG: Attempting self-healing migration...")
                from database import init_db
                init_db()
                
                # Retry operation logic needs to be careful about existing user check
                print("DEBUG: Retrying guest creation after migration...")
                
                # Since we just migrated, re-running the check should be safe if it was a column error
                # Re-check existing user first (checking for email in DB)
                existing_retry = get_user_by_email(db, email)
                if existing_retry and not existing_retry.is_guest:
                     raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This email is registered. Please sign in instead."
                    )
                
                if existing_retry and existing_retry.is_guest:
                    existing_retry.guest_expires_at = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
                    db.commit()
                    db.refresh(existing_retry)
                    return existing_retry

                guest_expires = datetime.utcnow() + timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES)
                random_password = get_password_hash(str(uuid.uuid4()))
                
                db_user_retry = User(
                    email=email,
                    hashed_password=random_password,
                    is_guest=True,
                    guest_expires_at=guest_expires
                )
                db.add(db_user_retry)
                db.commit()
                db.refresh(db_user_retry)
                return db_user_retry
            except Exception as retry_e:
                print(f"DEBUG: Self-healing failed: {retry_e}")
                # Fall through to raise original error
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    # Check if guest session has expired
    if user.is_guest and user.guest_expires_at:
        if datetime.utcnow() > user.guest_expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
