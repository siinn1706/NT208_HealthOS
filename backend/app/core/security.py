"""Security helpers — JWT encode/decode, password hashing, auth dependencies."""
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.models.core import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
http_bearer = HTTPBearer(auto_error=False)

JWT_BLACKLIST_PREFIX = "auth:jwt:blacklist:"


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "jti": str(uuid.uuid4()),  # unique token ID for revocation
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_ws_ticket(subject: str | Any, expires_seconds: int = 120) -> str:
    return create_access_token(
        subject,
        expires_delta=timedelta(seconds=expires_seconds),
        additional_claims={"typ": "ws_ticket"},
    )


def decode_access_token(token: str) -> dict:
    """Raises JWTError if token is invalid or expired."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """FastAPI dependency — resolves User from Bearer JWT, checks revocation blacklist."""
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

    # Check revocation blacklist before trusting the token
    jti = payload.get("jti")
    if jti and await redis.exists(f"{JWT_BLACKLIST_PREFIX}{jti}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_TOKEN_REVOKED", "message": "Token has been revoked."},
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


async def revoke_token(token: str, redis: Redis) -> None:
    """Add a JWT to the revocation blacklist until its natural expiry."""
    try:
        payload = decode_access_token(token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            ttl = max(1, int(exp - datetime.now(timezone.utc).timestamp()))
            await redis.setex(f"{JWT_BLACKLIST_PREFIX}{jti}", ttl, "1")
    except JWTError:
        pass  # Already expired — no need to blacklist
