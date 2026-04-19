"""B7 P9 — Account soft-delete + restore + (Celery-driven) hard purge.

Soft-delete model:
  * `users.deleted_at` and `users.purge_at` flip on request.
  * All sessions revoked immediately via the JWT blacklist.
  * The user is signed out; sign-in attempts during grace return 403.
  * Calling `/v1/users/me/restore` clears the flags (within the window).

Hard purge (daily Celery beat):
  * Cascades from `users.id` (FK ondelete=CASCADE) wipe all owned rows.
  * `audit_logs.user_id` is `ON DELETE SET NULL`, but we additionally
    redact `details.email` / `details.username` to a SHA-256 hash so the
    audit trail keeps its event sequence without retaining PII.
"""
from __future__ import annotations

import datetime
import hashlib
import logging
import uuid
from typing import Optional

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import JWT_BLACKLIST_PREFIX, decode_access_token, hash_password, verify_password
from app.models.audit import AuditLog
from app.models.core import User

logger = logging.getLogger(__name__)


GRACE_PERIOD = datetime.timedelta(days=30)


class IdentityCheckFailed(Exception):
    pass


class AlreadyPendingDeletion(Exception):
    pass


def _email_hash(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()


async def request_deletion(
    db: AsyncSession,
    *,
    user: User,
    confirmation_email: str,
    password: Optional[str],
    otp_verified: bool = False,
    reason: Optional[str] = None,
) -> User:
    """Mark `user` for deletion. Identity is re-checked.

    For users who have set a real password (`User.has_password=True`), the
    `password` argument is required and verified against `hashed_password`.
    For OAuth-only users (`has_password=False`), `otp_verified=True` is
    required — the caller must have already verified a freshly-issued OTP via
    the existing `services/otp` flow before calling this function.
    """
    if user.deleted_at is not None:
        raise AlreadyPendingDeletion()

    if confirmation_email.lower().strip() != user.email.lower().strip():
        raise IdentityCheckFailed("Confirmation email does not match.")

    user_has_password = bool(getattr(user, "has_password", True))
    if user_has_password:
        if not password:
            raise IdentityCheckFailed("Password is required to confirm deletion.")
        if not verify_password(password, user.hashed_password):
            raise IdentityCheckFailed("Incorrect password.")
    else:
        # OAuth-only user — no password to verify; require a fresh OTP.
        if not otp_verified:
            raise IdentityCheckFailed(
                "Verify a one-time code sent to your email before confirming deletion."
            )

    now = datetime.datetime.now(datetime.timezone.utc)
    user.deleted_at = now
    user.purge_at = now + GRACE_PERIOD
    user.deletion_reason = (reason or "")[:500]
    # B7 P1-5 — also stamp the global token cutoff so every device's JWT is
    # invalidated immediately, not only the caller's current one.
    user.tokens_invalidated_at = now
    await db.flush()
    return user


async def restore(db: AsyncSession, user: User) -> User:
    if user.deleted_at is None:
        return user
    user.deleted_at = None
    user.purge_at = None
    user.deletion_reason = None
    await db.flush()
    return user


async def revoke_all_sessions(redis: Redis, current_token: Optional[str]) -> None:
    """Best-effort: blacklist the caller's current JWT immediately so this
    response is the last one served on it. Future tokens minted via OAuth or
    /auth/login will be rejected by `get_current_user` because of `deleted_at`.
    """
    if not current_token:
        return
    try:
        payload = decode_access_token(current_token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            ttl = max(
                1,
                int(exp - datetime.datetime.now(datetime.timezone.utc).timestamp()),
            )
            await redis.setex(f"{JWT_BLACKLIST_PREFIX}{jti}", ttl, "1")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to blacklist current JWT during deletion request")


async def anonymize_audit_logs(db: AsyncSession, user_id: uuid.UUID, email: str) -> int:
    """Replace PII in audit log `details` with hashes, leave event_type +
    timestamp intact. Run from the Celery purge task, just before the user
    row is hard-deleted (the FK is ON DELETE SET NULL but the JSONB details
    are not automatically scrubbed).
    """
    rows = (
        await db.execute(select(AuditLog).where(AuditLog.user_id == user_id))
    ).scalars().all()
    digest = _email_hash(email)
    for row in rows:
        details = row.details or {}
        if not isinstance(details, dict):
            continue
        for key in ("email", "username", "ip_address"):
            if key in details:
                details[key] = "[redacted]"
        details["email_hash"] = digest
        row.details = details
    await db.flush()
    return len(rows)
