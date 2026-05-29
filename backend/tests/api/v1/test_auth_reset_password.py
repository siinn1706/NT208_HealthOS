from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest

from app.api.v1.endpoints import auth as auth_endpoints
from app.exceptions import ApiException, NotFoundException
from app.schemas.auth import AuthToken, ResetPasswordBody


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDb:
    def __init__(self, user):
        self.user = user
        self.commits = 0

    async def execute(self, _stmt):
        return _FakeResult(self.user)

    async def commit(self):
        self.commits += 1


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def getdel(self, key: str):
        return self.values.pop(key, None)


def _body(email: str = "reset@example.com") -> ResetPasswordBody:
    return ResetPasswordBody(email=email, new_password="NewStrongPass!234")


def _request():
    return SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={"user-agent": "pytest"})


def _user(email: str = "reset@example.com"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        email=email,
        username="reset_user",
        display_name="Reset User",
        profile=SimpleNamespace(avatar_url=None),
        hashed_password="old-hash",
        has_password=True,
        banned_at=None,
        banned_until=None,
    )


def _token(user) -> AuthToken:
    return AuthToken(
        access_token="access-token",
        refresh_token="refresh-token",
        user_id=str(user.id),
        email=user.email,
        username=user.username,
        display_name=user.display_name,
    )


@pytest.mark.asyncio
async def test_reset_password_breached_password_keeps_verified_marker(monkeypatch):
    redis = _FakeRedis()
    verified_key = "auth:otp:reset_verified:reset@example.com"
    redis.values[verified_key] = "1"

    async def _breached(_password):
        return True, 42

    monkeypatch.setattr(auth_endpoints, "check_password_breach", _breached)

    with pytest.raises(ApiException) as exc_info:
        await auth_endpoints.reset_password(
            body=_body(),
            request=_request(),
            redis=redis,
            db=_FakeDb(_user()),
        )

    assert exc_info.value.detail["code"] == "PASSWORD_BREACHED"
    assert redis.values[verified_key] == "1"


@pytest.mark.asyncio
async def test_reset_password_missing_user_keeps_verified_marker(monkeypatch):
    redis = _FakeRedis()
    verified_key = "auth:otp:reset_verified:missing@example.com"
    redis.values[verified_key] = "1"

    async def _not_breached(_password):
        return False, 0

    monkeypatch.setattr(auth_endpoints, "check_password_breach", _not_breached)

    with pytest.raises(NotFoundException):
        await auth_endpoints.reset_password(
            body=_body("missing@example.com"),
            request=_request(),
            redis=redis,
            db=_FakeDb(None),
        )

    assert redis.values[verified_key] == "1"


@pytest.mark.asyncio
async def test_reset_password_success_consumes_marker_and_blocks_replay(monkeypatch):
    user = _user()
    db = _FakeDb(user)
    redis = _FakeRedis()
    verified_key = "auth:otp:reset_verified:reset@example.com"
    redis.values[verified_key] = "1"
    revoked: list[uuid.UUID] = []

    async def _not_breached(_password):
        return False, 0

    async def _issue_token(*, db, user, request):
        return _token(user)

    async def _revoke_tokens(_db, *, user_id):
        revoked.append(user_id)

    monkeypatch.setattr(auth_endpoints, "check_password_breach", _not_breached)
    monkeypatch.setattr(auth_endpoints, "_issue_auth_token", _issue_token)
    monkeypatch.setattr(auth_endpoints, "revoke_refresh_tokens_for_user", _revoke_tokens)
    monkeypatch.setattr("app.core.security.hash_password", lambda _password: "new-hash")

    response = await auth_endpoints.reset_password(
        body=_body(),
        request=_request(),
        redis=redis,
        db=db,
    )

    assert response.data.access_token == "access-token"
    assert verified_key not in redis.values
    assert user.hashed_password == "new-hash"
    assert user.has_password is True
    assert revoked == [user.id]
    assert db.commits == 1

    with pytest.raises(ApiException) as exc_info:
        await auth_endpoints.reset_password(
            body=_body(),
            request=_request(),
            redis=redis,
            db=db,
        )
    assert exc_info.value.detail["code"] == "OTP_REQUIRED"
