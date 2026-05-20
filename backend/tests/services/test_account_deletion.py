"""Unit tests for the account-deletion service (B7 review P0-2 / P1-7)."""
from __future__ import annotations

import datetime
import uuid

import pytest

from app.core.security import hash_password
from app.models.core import User
from app.services.account_deletion import (
    AlreadyPendingDeletion,
    GRACE_PERIOD,
    IdentityCheckFailed,
    request_deletion,
)


class _FakeAsyncSession:
    """Minimal async session — only `flush` is touched by `request_deletion`."""

    async def execute(self, _stmt):
        return None

    async def flush(self):
        return None


def _make_user(*, has_password: bool, raw_password: str | None = None) -> User:
    user = User()
    user.id = uuid.uuid4()
    user.email = "alice@example.com"
    user.username = "alice"
    user.display_name = "Alice"
    user.hashed_password = hash_password(raw_password or "irrelevant-placeholder")
    user.has_password = has_password
    user.deleted_at = None
    user.purge_at = None
    return user


@pytest.mark.asyncio
async def test_password_user_can_delete_with_correct_password():
    user = _make_user(has_password=True, raw_password="MySecret-123!")
    out = await request_deletion(
        db=_FakeAsyncSession(),
        user=user,
        confirmation_email="alice@example.com",
        password="MySecret-123!",
        otp_verified=False,
    )
    assert out.deleted_at is not None
    assert out.purge_at is not None
    assert out.purge_at - out.deleted_at == GRACE_PERIOD
    # tokens_invalidated_at must be set so other devices' JWTs are rejected.
    assert out.tokens_invalidated_at == out.deleted_at


@pytest.mark.asyncio
async def test_password_user_with_wrong_password_is_rejected():
    user = _make_user(has_password=True, raw_password="MySecret-123!")
    with pytest.raises(IdentityCheckFailed, match="Incorrect password"):
        await request_deletion(
            db=_FakeAsyncSession(),
            user=user,
            confirmation_email="alice@example.com",
            password="totally-wrong",
            otp_verified=False,
        )
    # User must remain undeleted on a failed check.
    assert user.deleted_at is None


@pytest.mark.asyncio
async def test_oauth_only_user_is_rejected_without_otp():
    """B7 review P0-2 — OAuth-only users used to be locked out entirely.
    Now they can delete IFF the caller has verified an OTP first."""
    user = _make_user(has_password=False)
    with pytest.raises(IdentityCheckFailed, match="one-time code"):
        await request_deletion(
            db=_FakeAsyncSession(),
            user=user,
            confirmation_email="alice@example.com",
            password=None,
            otp_verified=False,
        )


@pytest.mark.asyncio
async def test_oauth_only_user_can_delete_with_verified_otp():
    user = _make_user(has_password=False)
    out = await request_deletion(
        db=_FakeAsyncSession(),
        user=user,
        confirmation_email="alice@example.com",
        password=None,
        otp_verified=True,
    )
    assert out.deleted_at is not None
    assert out.tokens_invalidated_at is not None


@pytest.mark.asyncio
async def test_email_mismatch_is_rejected():
    user = _make_user(has_password=True, raw_password="x" * 12)
    with pytest.raises(IdentityCheckFailed, match="Confirmation email"):
        await request_deletion(
            db=_FakeAsyncSession(),
            user=user,
            confirmation_email="not-alice@example.com",
            password="x" * 12,
            otp_verified=False,
        )


@pytest.mark.asyncio
async def test_already_pending_deletion_raises():
    user = _make_user(has_password=True, raw_password="x" * 12)
    user.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    user.purge_at = user.deleted_at + GRACE_PERIOD
    with pytest.raises(AlreadyPendingDeletion):
        await request_deletion(
            db=_FakeAsyncSession(),
            user=user,
            confirmation_email="alice@example.com",
            password="x" * 12,
            otp_verified=False,
        )
