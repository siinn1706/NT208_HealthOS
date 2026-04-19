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


# Convert a datetime to a Unix epoch (seconds) — used for `iat`/`exp` math
# without relying on `datetime.timestamp()` mocks in tests.
def _to_epoch(dt: datetime) -> int:
    return int(dt.replace(tzinfo=timezone.utc if dt.tzinfo is None else dt.tzinfo).timestamp())

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
http_bearer = HTTPBearer(auto_error=False)

JWT_BLACKLIST_PREFIX = "auth:jwt:blacklist:"

# Pre-computed bcrypt hash of a throwaway string.  Used in login to perform a
# dummy verify when the identifier is not found, equalising response time and
# preventing timing-based user enumeration attacks.
DUMMY_HASH: str = pwd_context.hash("__healthos_timing_dummy__")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        # `iat` lets `get_current_user` compare against `users.tokens_invalidated_at`
        # so we can revoke every device's session in one stroke (B7 P1-5).
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),  # unique token ID for per-token revocation
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

    # B7 P1-5 — global per-user JWT cutoff. Any token with `iat <
    # users.tokens_invalidated_at` is rejected. Tokens issued before this
    # function existed (no `iat` claim) bypass the check by design — they
    # remain valid until natural expiry.
    invalidated_at = getattr(user, "tokens_invalidated_at", None)
    if invalidated_at is not None:
        iat_epoch = payload.get("iat")
        if iat_epoch is not None and iat_epoch < int(invalidated_at.replace(
            tzinfo=timezone.utc if invalidated_at.tzinfo is None else invalidated_at.tzinfo,
        ).timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "AUTH_TOKEN_REVOKED",
                    "message": "Session was revoked. Please sign in again.",
                },
            )

    # B7 P9 — refuse access to soft-deleted accounts. The /restore endpoint
    # opts out via `get_current_user_for_restore` below.
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_PENDING_DELETION",
                "message": "Your account is pending deletion. Restore it to continue.",
                "details": {
                    "purge_at": user.purge_at.isoformat() if user.purge_at else None,
                },
            },
        )

    return user


async def get_current_user_for_restore(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """Variant of `get_current_user` that ALLOWS pending-deletion users.

    Used only by the restore endpoint so a user who submitted a deletion
    request can sign back in (within the grace period) and cancel it.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Authentication required."},
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_INVALID_TOKEN", "message": "Invalid or expired token."},
        )
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
