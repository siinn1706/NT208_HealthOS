"""Regression tests for auth OTP request flow."""

import pytest
from sqlalchemy import select

from app.api.v1.endpoints.auth import OTP_TTL_SECONDS, request_email_otp
from app.models.core import User
from app.schemas.auth import RequestOtpBody


class _FakeResult:
    def scalar_one_or_none(self):
        return None


class _FakeDbSession:
    async def execute(self, stmt):
        # The endpoint should still query for user existence with a User select.
        assert isinstance(stmt, type(select(User)))
        return _FakeResult()


class _FakeSessionContext:
    async def __aenter__(self):
        return _FakeDbSession()

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def exists(self, key: str) -> int:
        return 1 if key in self.values else 0

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.values[key] = value


@pytest.mark.asyncio
async def test_request_otp_reset_password_unknown_email_returns_generic_success(monkeypatch):
    """Unknown email in reset_password flow must not error or enumerate accounts."""
    import app.adapters.database as db_module

    monkeypatch.setattr(db_module, "AsyncSessionLocal", lambda: _FakeSessionContext())

    redis = _FakeRedis()
    body = RequestOtpBody(email="unknown@example.com", purpose="reset_password")

    res = await request_email_otp(body=body, redis=redis, _rate=None)

    assert res.data.delivery == "email"
    assert res.data.expires_in_seconds == OTP_TTL_SECONDS
    assert res.data.otp is None
    assert redis.values["auth:otp:cooldown:reset_password:unknown@example.com"] == "1"
