"""Security helpers — JWT encode/decode, password hashing, auth dependencies."""
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.database import get_db
from app.core.config import settings
from app.models.core import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
http_bearer = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """Raises JWTError if token is invalid or expired."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency — resolves User from Bearer JWT."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Authentication required."},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_INVALID_TOKEN", "message": "Invalid or expired token."},
        )

    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_INVALID_TOKEN", "message": "Token subject is missing."},
        )

    try:
        user_id = uuid.UUID(subject)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_INVALID_TOKEN", "message": "Token subject is invalid."},
        )

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_NOT_FOUND", "message": "User not found."},
        )

    return user
