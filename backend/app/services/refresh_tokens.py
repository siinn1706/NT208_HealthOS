from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.core import RefreshTokenSession, User
from app.services.account_status import is_active_ban


class RefreshTokenError(Exception):
    code = "INVALID_REFRESH_TOKEN"
    message = "Refresh token is invalid or expired."


class RefreshTokenReuseError(RefreshTokenError):
    code = "REFRESH_TOKEN_REUSE_DETECTED"
    message = "Refresh token reuse detected. Please sign in again."


class RefreshTokenUserBannedError(RefreshTokenError):
    code = "ACCOUNT_BANNED"
    message = "Your account has been banned."


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def _normalize_user_agent(user_agent: str | None) -> str | None:
    if user_agent is None:
        return None
    clipped = user_agent.strip()
    if not clipped:
        return None
    return clipped[:1024]


async def issue_refresh_token(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> str:
    now = _utc_now()
    plaintext = _generate_refresh_token()
    row = RefreshTokenSession(
        user_id=user_id,
        token_hash=hash_refresh_token(plaintext),
        family_id=family_id or uuid.uuid4(),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip_address,
        user_agent=_normalize_user_agent(user_agent),
    )
    db.add(row)
    await db.flush()
    return plaintext


async def revoke_refresh_token(
    db: AsyncSession,
    *,
    refresh_token: str,
) -> bool:
    token_hash = hash_refresh_token(refresh_token)
    row = (
        await db.execute(
            select(RefreshTokenSession).where(RefreshTokenSession.token_hash == token_hash)
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    if row.revoked_at is None:
        row.revoked_at = _utc_now()
        await db.flush()
    return True


async def revoke_refresh_token_family(
    db: AsyncSession,
    *,
    family_id: uuid.UUID,
    revoked_at: datetime | None = None,
) -> None:
    now = revoked_at or _utc_now()
    await db.execute(
        update(RefreshTokenSession)
        .where(
            RefreshTokenSession.family_id == family_id,
            RefreshTokenSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    await db.flush()


async def revoke_refresh_tokens_for_user(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> None:
    now = _utc_now()
    await db.execute(
        update(RefreshTokenSession)
        .where(
            RefreshTokenSession.user_id == user_id,
            RefreshTokenSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    await db.flush()


async def rotate_refresh_token(
    db: AsyncSession,
    *,
    refresh_token: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str]:
    now = _utc_now()
    token_hash = hash_refresh_token(refresh_token)
    session = (
        await db.execute(
            select(RefreshTokenSession)
            .where(RefreshTokenSession.token_hash == token_hash)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if session is None:
        raise RefreshTokenError()

    if session.revoked_at is not None:
        if session.replaced_by_id is not None:
            await revoke_refresh_token_family(
                db,
                family_id=session.family_id,
                revoked_at=now,
            )
            from app.core.event_logging import log_event
            log_event("auth.refresh", "rotate", "reuse_detected",
                      user_id=str(session.user_id))
            raise RefreshTokenReuseError()
        raise RefreshTokenError()

    if session.expires_at <= now:
        session.revoked_at = now
        await db.flush()
        raise RefreshTokenError()

    user = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == session.user_id)
        )
    ).scalar_one_or_none()
    if user is None:
        session.revoked_at = now
        await db.flush()
        raise RefreshTokenError()
    if is_active_ban(user, now=now):
        session.revoked_at = now
        await db.flush()
        raise RefreshTokenUserBannedError()

    replacement_plaintext = _generate_refresh_token()
    replacement = RefreshTokenSession(
        user_id=session.user_id,
        token_hash=hash_refresh_token(replacement_plaintext),
        family_id=session.family_id,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip_address,
        user_agent=_normalize_user_agent(user_agent),
        last_used_at=now,
    )
    db.add(replacement)
    await db.flush()

    session.revoked_at = now
    session.replaced_by_id = replacement.id
    session.last_used_at = now
    await db.flush()
    from app.core.event_logging import log_event
    log_event("auth.refresh", "rotate", "ok", user_id=str(user.id))
    return user, replacement_plaintext
