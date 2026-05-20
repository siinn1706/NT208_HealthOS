from types import SimpleNamespace
import uuid

import pytest

from app.api.v1.endpoints import auth as auth_endpoints
from app.schemas.auth import AuthToken, LoginBody, MfaLoginVerifyBody


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDb:
    def __init__(self, user):
        self._user = user
        self.commits = 0

    async def execute(self, _stmt):
        return _FakeResult(self._user)

    async def commit(self):
        self.commits += 1


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    async def setex(self, key: str, ttl: int, value: str):
        self.values[key] = value
        self.ttls[key] = ttl

    async def get(self, key: str):
        return self.values.get(key)

    async def delete(self, key: str):
        self.values.pop(key, None)
        self.ttls.pop(key, None)

    async def ttl(self, key: str):
        return self.ttls.get(key, -1)


def _fake_request():
    return SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers={"user-agent": "pytest"},
    )


def _fake_user(*, mfa_enabled: bool = True):
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="user@example.com",
        username="user",
        display_name="Test User",
        onboarding_status="pending",
        profile=SimpleNamespace(avatar_url=None),
        hashed_password="hashed",
        deleted_at=None,
        purge_at=None,
        mfa_enabled=mfa_enabled,
        mfa_secret="totp-secret" if mfa_enabled else None,
        mfa_recovery_codes=["recovery"],
    )


@pytest.mark.asyncio
async def test_login_with_password_returns_mfa_challenge(monkeypatch):
    user = _fake_user(mfa_enabled=True)
    redis = _FakeRedis()
    db = _FakeDb(user)
    reset_calls: list[bool] = []

    async def _get_user_by_identifier(_db, _identifier):
        return user

    async def _check_account_lockout(_user):
        return False

    async def _record_failed_login(_db, _user):
        return None

    async def _reset_failed_login_attempts(_db, _user):
        reset_calls.append(True)

    async def _log_security_event(*_args, **_kwargs):
        return None

    monkeypatch.setattr(auth_endpoints, "get_user_by_identifier", _get_user_by_identifier)
    monkeypatch.setattr(auth_endpoints, "log_security_event", _log_security_event)
    monkeypatch.setattr("app.core.security.verify_password", lambda _plain, _hashed: True)
    monkeypatch.setattr("app.services.auth.check_account_lockout", _check_account_lockout)
    monkeypatch.setattr("app.services.auth.record_failed_login", _record_failed_login)
    monkeypatch.setattr("app.services.auth.reset_failed_login_attempts", _reset_failed_login_attempts)

    response = await auth_endpoints.login_with_password(
        body=LoginBody(identifier="user@example.com", password="correct-password"),
        request=_fake_request(),
        db=db,
        redis=redis,
        _rate=None,
    )

    assert response.data.mfa_required is True
    assert response.data.challenge_id
    challenge_key = auth_endpoints._mfa_login_challenge_key(response.data.challenge_id)
    assert challenge_key in redis.values
    assert reset_calls == []


@pytest.mark.asyncio
async def test_login_with_mfa_rejects_missing_challenge(monkeypatch):
    redis = _FakeRedis()
    db = _FakeDb(_fake_user())

    with pytest.raises(Exception) as exc_info:
        await auth_endpoints.login_with_mfa(
            body=MfaLoginVerifyBody(challenge_id="missing", code="123456"),
            request=_fake_request(),
            db=db,
            redis=redis,
        )

    assert getattr(exc_info.value, "detail", {}).get("code") == "MFA_CHALLENGE_INVALID"


@pytest.mark.asyncio
async def test_login_with_mfa_success_issues_tokens(monkeypatch):
    user = _fake_user()
    db = _FakeDb(user)
    redis = _FakeRedis()
    challenge_id = "challenge-123"
    await redis.setex(
        auth_endpoints._mfa_login_challenge_key(challenge_id),
        auth_endpoints.MFA_LOGIN_CHALLENGE_TTL_SECONDS,
        f'{{"user_id":"{user.id}","attempts_left":5}}',
    )
    reset_calls: list[bool] = []

    async def _reset_failed_login_attempts(_db, _user):
        reset_calls.append(True)

    async def _record_failed_login(_db, _user):
        return None

    async def _log_security_event(*_args, **_kwargs):
        return None

    async def _issue_auth_token(**_kwargs):
        return AuthToken(
            access_token="access-token",
            refresh_token="refresh-token",
            user_id=str(user.id),
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            avatar_url=None,
            onboarding_status=user.onboarding_status,
        )

    monkeypatch.setattr("app.services.auth.reset_failed_login_attempts", _reset_failed_login_attempts)
    monkeypatch.setattr("app.services.auth.record_failed_login", _record_failed_login)
    monkeypatch.setattr(auth_endpoints, "log_security_event", _log_security_event)
    monkeypatch.setattr(auth_endpoints, "_issue_auth_token", _issue_auth_token)
    monkeypatch.setattr(auth_endpoints.totp_service, "verify_recovery_code", lambda _c, _codes: (False, _codes))
    monkeypatch.setattr(auth_endpoints.totp_service, "verify", lambda _s, _c: True)

    response = await auth_endpoints.login_with_mfa(
        body=MfaLoginVerifyBody(challenge_id=challenge_id, code="123456"),
        request=_fake_request(),
        db=db,
        redis=redis,
    )

    assert response.data.access_token == "access-token"
    assert response.data.refresh_token == "refresh-token"
    assert reset_calls == [True]
    assert auth_endpoints._mfa_login_challenge_key(challenge_id) not in redis.values
