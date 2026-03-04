from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.core import EmailOtp

OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 5


def hash_otp_code(code: str) -> str:
    payload = f"{settings.secret_key}:{code}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def otp_expiry_time(ttl_seconds: int = OTP_TTL_SECONDS) -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)


async def cleanup_expired_otps(db: AsyncSession, email: str, purpose: str) -> None:
    now = datetime.now(timezone.utc)
    await db.execute(
        delete(EmailOtp).where(
            EmailOtp.email == email,
            EmailOtp.purpose == purpose,
            EmailOtp.expires_at < now,
        )
    )


async def get_latest_active_otp(
    db: AsyncSession,
    email: str,
    purpose: str,
) -> EmailOtp | None:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(EmailOtp)
        .where(
            EmailOtp.email == email,
            EmailOtp.purpose == purpose,
            EmailOtp.expires_at > now,
            EmailOtp.consumed_at.is_(None),
        )
        .order_by(EmailOtp.created_at.desc())
    )
    return result.scalars().first()


async def create_otp_audit_record(
    db: AsyncSession,
    email: str,
    purpose: str,
    raw_code: str,
    expires_at: datetime,
) -> EmailOtp:
    record = EmailOtp(
        email=email,
        purpose=purpose,
        code_hash=hash_otp_code(raw_code),
        expires_at=expires_at,
        attempts_left=OTP_MAX_ATTEMPTS,
    )
    db.add(record)
    await db.flush()
    return record


async def decrement_attempts(db: AsyncSession, record: EmailOtp) -> int:
    if record.attempts_left > 0:
        record.attempts_left -= 1
    await db.flush()
    return record.attempts_left


async def mark_otp_consumed(db: AsyncSession, record: EmailOtp) -> None:
    record.consumed_at = datetime.now(timezone.utc)
    await db.flush()
