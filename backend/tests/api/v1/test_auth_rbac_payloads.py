from types import SimpleNamespace
import uuid

import pytest

from app.api.v1.endpoints import auth as auth_endpoints


class _FakeDb:
    async def commit(self):
        return None


def _fake_request():
    return SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers={"user-agent": "pytest"},
    )


def _fake_user():
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="admin@example.com",
        username="admin",
        display_name="Admin User",
        onboarding_status="completed",
        onboarding_completed_at=None,
        created_at=None,
        profile=SimpleNamespace(avatar_url=None),
    )


def _patch_auth_token_deps(monkeypatch):
    async def _issue_refresh_token(*_args, **_kwargs):
        return "refresh-token"

    monkeypatch.setattr(auth_endpoints, "create_user_access_token", lambda _user: "access-token")
    monkeypatch.setattr(auth_endpoints, "issue_refresh_token", _issue_refresh_token)
    monkeypatch.setattr(
        auth_endpoints,
        "rbac_service",
        SimpleNamespace(
            list_user_roles=lambda _db, _user_id: _async_value(["admin"]),
            list_user_permissions=lambda _db, _user_id: _async_value({"admin.access"}),
        ),
        raising=False,
    )


async def _async_value(value):
    return value


@pytest.mark.asyncio
async def test_issue_auth_token_includes_admin_roles_and_permissions(monkeypatch):
    _patch_auth_token_deps(monkeypatch)

    token = await auth_endpoints._issue_auth_token(
        db=_FakeDb(),
        user=_fake_user(),
        request=_fake_request(),
    )

    assert token.roles == ["admin"]
    assert token.permissions == ["admin.access"]


@pytest.mark.asyncio
async def test_get_me_includes_admin_roles_and_permissions(monkeypatch):
    monkeypatch.setattr(
        auth_endpoints,
        "rbac_service",
        SimpleNamespace(
            list_user_roles=lambda _db, _user_id: _async_value(["admin"]),
            list_user_permissions=lambda _db, _user_id: _async_value({"admin.access"}),
        ),
        raising=False,
    )

    response = await auth_endpoints.get_me(
        current_user=_fake_user(),
        db=_FakeDb(),
    )

    assert response.data.roles == ["admin"]
    assert response.data.permissions == ["admin.access"]
