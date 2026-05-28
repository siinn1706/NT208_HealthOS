from types import SimpleNamespace
import uuid

import pytest

from app.api.v1.endpoints import auth as auth_endpoints
from app.services.refresh_tokens import RefreshTokenError


class _FakeDb:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1


def _fake_request():
    return SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers={"user-agent": "pytest"},
    )


@pytest.mark.asyncio
async def test_refresh_access_token_returns_rotated_bundle(monkeypatch):
    user = SimpleNamespace(
        id=uuid.uuid4(),
        email="user@example.com",
        username="user",
        display_name="Test User",
        onboarding_status="pending",
        profile=SimpleNamespace(avatar_url=None),
    )
    db = _FakeDb()

    async def _rotate_refresh_token(*_args, **_kwargs):
        return user, "next-refresh-token"

    monkeypatch.setattr(auth_endpoints, "rotate_refresh_token", _rotate_refresh_token)
    monkeypatch.setattr(auth_endpoints, "create_user_access_token", lambda _user: "new-access-token")
    monkeypatch.setattr(
        auth_endpoints,
        "_rbac_snapshot",
        lambda _db, _user_id: _async_value((["admin"], ["admin.access"])),
    )

    response = await auth_endpoints.refresh_access_token(
        body=SimpleNamespace(refresh_token="old-refresh-token"),
        request=_fake_request(),
        db=db,
    )

    assert response.data.access_token == "new-access-token"
    assert response.data.refresh_token == "next-refresh-token"
    assert response.data.roles == ["admin"]
    assert response.data.permissions == ["admin.access"]
    assert db.commits == 1


@pytest.mark.asyncio
async def test_refresh_access_token_rejects_invalid_refresh_token(monkeypatch):
    db = _FakeDb()

    async def _rotate_refresh_token(*_args, **_kwargs):
        raise RefreshTokenError()

    monkeypatch.setattr(auth_endpoints, "rotate_refresh_token", _rotate_refresh_token)

    with pytest.raises(Exception) as exc_info:
        await auth_endpoints.refresh_access_token(
            body=SimpleNamespace(refresh_token="invalid"),
            request=_fake_request(),
            db=db,
        )

    assert getattr(exc_info.value, "detail", {}).get("code") == "INVALID_REFRESH_TOKEN"
    assert db.commits == 1


async def _async_value(value):
    return value
