from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import auth as auth_endpoints
from app.core.security import create_access_token, get_current_user
from app.schemas.auth import LoginBody


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
    def __init__(self, *, set_result=True):
        self.values: dict[str, str] = {}
        self.set_result = set_result
        self.set_calls = []

    async def exists(self, key: str):
        return key in self.values

    async def setex(self, key: str, _ttl: int, value: str):
        self.values[key] = value

    async def set(self, key: str, value: str, *, ex=None, nx=False):
        self.set_calls.append((key, value, ex, nx))
        return self.set_result


class _FakeBackgroundTasks:
    def __init__(self):
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))


def _request():
    return SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={"user-agent": "pytest"})


def _banned_user(*, banned_until=None):
    now = datetime.datetime.now(datetime.timezone.utc)
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="banned@example.com",
        username="banned",
        display_name="Banned User",
        onboarding_status="completed",
        onboarding_completed_at=None,
        email_verified_at=now,
        profile=SimpleNamespace(avatar_url=None),
        hashed_password="hashed",
        deleted_at=None,
        purge_at=None,
        tokens_invalidated_at=None,
        banned_at=now,
        banned_until=banned_until,
        banned_reason="policy",
        mfa_enabled=False,
    )


@pytest.mark.asyncio
async def test_get_current_user_rejects_active_banned_account():
    user = _banned_user()
    token = create_access_token(str(user.id))
    credentials = SimpleNamespace(scheme="Bearer", credentials=token)
    background_tasks = _FakeBackgroundTasks()

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(
            background_tasks=background_tasks,
            credentials=credentials,
            db=_FakeDb(user),
            redis=_FakeRedis(),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "ACCOUNT_BANNED"
    assert background_tasks.calls == []


@pytest.mark.asyncio
async def test_expired_ban_does_not_block_current_user(monkeypatch):
    user = _banned_user(
        banned_until=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
    )
    token = create_access_token(str(user.id))
    credentials = SimpleNamespace(scheme="Bearer", credentials=token)
    background_tasks = _FakeBackgroundTasks()
    redis = _FakeRedis()
    touched: list[uuid.UUID] = []

    async def _touch(user_id):
        touched.append(user_id)

    monkeypatch.setattr("app.services.auth_touch.touch_user_last_seen", _touch)

    current = await get_current_user(
        background_tasks=background_tasks,
        credentials=credentials,
        db=_FakeDb(user),
        redis=redis,
    )

    assert current.id == user.id
    assert touched == []
    assert len(background_tasks.calls) == 1
    func, args, kwargs = background_tasks.calls[0]
    assert func is _touch
    assert args == (user.id,)
    assert kwargs == {}
    assert redis.set_calls == [
        (f"auth:last_seen_touch:{user.id}", "1", 60, True),
    ]


@pytest.mark.asyncio
async def test_pending_deletion_does_not_schedule_last_seen_touch():
    user = _banned_user()
    user.banned_at = None
    user.banned_until = None
    user.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    user.purge_at = user.deleted_at + datetime.timedelta(days=7)
    token = create_access_token(str(user.id))
    credentials = SimpleNamespace(scheme="Bearer", credentials=token)
    background_tasks = _FakeBackgroundTasks()

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(
            background_tasks=background_tasks,
            credentials=credentials,
            db=_FakeDb(user),
            redis=_FakeRedis(),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "ACCOUNT_PENDING_DELETION"
    assert background_tasks.calls == []


@pytest.mark.asyncio
async def test_login_with_password_rejects_banned_account(monkeypatch):
    user = _banned_user()

    async def _get_user_by_identifier(_db, _identifier):
        return user

    async def _check_account_lockout(_user):
        return False

    async def _log_security_event(*_args, **_kwargs):
        return None

    monkeypatch.setattr(auth_endpoints, "get_user_by_identifier", _get_user_by_identifier)
    monkeypatch.setattr(auth_endpoints, "log_security_event", _log_security_event)
    monkeypatch.setattr("app.core.security.verify_password", lambda _plain, _hashed: True)
    monkeypatch.setattr("app.services.auth.check_account_lockout", _check_account_lockout)

    with pytest.raises(HTTPException) as exc_info:
        await auth_endpoints.login_with_password(
            body=LoginBody(identifier=user.email, password="correct"),
            request=_request(),
            db=_FakeDb(user),
            redis=_FakeRedis(),
            _rate=None,
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "ACCOUNT_BANNED"


@pytest.mark.asyncio
async def test_refresh_rejects_banned_account(monkeypatch):
    user = _banned_user()

    async def _rotate_refresh_token(*_args, **_kwargs):
        return user, "next-refresh-token"

    monkeypatch.setattr(auth_endpoints, "rotate_refresh_token", _rotate_refresh_token)

    with pytest.raises(HTTPException) as exc_info:
        await auth_endpoints.refresh_access_token(
            body=SimpleNamespace(refresh_token="old-refresh-token"),
            request=_request(),
            db=_FakeDb(user),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "ACCOUNT_BANNED"
