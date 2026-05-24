from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.adapters.database import AsyncSessionLocal, engine, get_db
from app.core.security import get_current_user
from app.models.core import User, UserProfile
from app.models.rbac import UserRole
from app.models.subscriptions import UserSubscription
from app.services import rbac as rbac_service
from app.services import subscriptions as subscription_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


async def _create_user(db, *, email_prefix: str, is_system: bool = False) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{email_prefix}-{user_id.hex[:8]}@test.local",
        username=f"{email_prefix}_{user_id.hex[:8]}",
        display_name=f"{email_prefix} user",
        hashed_password="x",
        has_password=True,
        is_system=is_system,
    )
    db.add(user)
    await db.flush()
    db.add(UserProfile(user_id=user.id, full_name=user.display_name))
    await db.flush()
    return user


def _stub_user(user: User) -> SimpleNamespace:
    return SimpleNamespace(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        onboarding_status=user.onboarding_status,
        onboarding_completed_at=user.onboarding_completed_at,
        email_verified_at=user.email_verified_at,
        created_at=user.created_at,
        profile=None,
        deleted_at=user.deleted_at,
        purge_at=user.purge_at,
        is_system=user.is_system,
    )


@pytest_asyncio.fixture
async def admin_api_state():
    created_user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        await rbac_service.ensure_default_roles_and_permissions(db, commit=False)
        await subscription_service.seed_default_subscription_plans(db, commit=False)
        admin = await _create_user(db, email_prefix="adminapi-admin")
        normal = await _create_user(db, email_prefix="adminapi-normal")
        created_user_ids.extend([admin.id, normal.id])
        await subscription_service.ensure_user_default_subscription(db, normal.id)
        await db.commit()
        await rbac_service.grant_role(db, admin.id, rbac_service.DEFAULT_ROLE_ADMIN)
        await db.commit()
        yield admin, normal, created_user_ids

    if created_user_ids:
        async with AsyncSessionLocal() as cleanup:
            await cleanup.execute(delete(UserSubscription).where(UserSubscription.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(UserRole).where(UserRole.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(User).where(User.id.in_(created_user_ids)))
            await cleanup.commit()
    await engine.dispose()


async def _client_for(user: User | None):
    from app.main import app

    app.dependency_overrides.clear()

    async def _override_db():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _override_db

    if user is not None:
        async def _override_user():
            return _stub_user(user)

        app.dependency_overrides[get_current_user] = _override_user

    transport = ASGITransport(app=app)
    return app, AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_admin_overview_requires_auth():
    from app.main import app

    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/admin/overview")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_normal_user_cannot_access_admin_users(admin_api_state):
    _admin, normal, _ids = admin_api_state
    app, client = await _client_for(normal)
    async with client:
        response = await client.get("/v1/admin/users")
    app.dependency_overrides.clear()
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_can_list_users_with_current_subscription(admin_api_state):
    admin, normal, _ids = admin_api_state
    app, client = await _client_for(admin)
    async with client:
        response = await client.get(f"/v1/admin/users?q={normal.email}&status=all")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 1
    item = next(item for item in body["data"] if item["id"] == str(normal.id))
    assert item["email"] == normal.email
    assert item["current_subscription"]["plan_code"] == "free"
    assert "roles" in item


@pytest.mark.asyncio
async def test_admin_can_ban_and_unban_user(admin_api_state):
    admin, normal, _ids = admin_api_state
    app, client = await _client_for(admin)
    async with client:
        ban_response = await client.post(
            f"/v1/admin/users/{normal.id}/ban",
            json={"reason": "policy test", "banned_until": None},
        )
        unban_response = await client.post(f"/v1/admin/users/{normal.id}/unban")
    app.dependency_overrides.clear()

    assert ban_response.status_code == 200
    banned = ban_response.json()["data"]
    assert banned["account_status"] == "banned"
    assert banned["banned_reason"] == "policy test"

    assert unban_response.status_code == 200
    unbanned = unban_response.json()["data"]
    assert unbanned["account_status"] == "active"
    assert unbanned["banned_at"] is None
    assert unbanned["banned_reason"] is None


@pytest.mark.asyncio
async def test_admin_cannot_ban_self(admin_api_state):
    admin, _normal, _ids = admin_api_state
    app, client = await _client_for(admin)
    async with client:
        response = await client.post(
            f"/v1/admin/users/{admin.id}/ban",
            json={"reason": "self"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ADMIN_CANNOT_BAN_SELF"


@pytest.mark.asyncio
async def test_overview_online_count_uses_last_seen(admin_api_state):
    admin, normal, _ids = admin_api_state
    now = datetime.datetime.now(datetime.timezone.utc)
    async with AsyncSessionLocal() as db:
        db_user = await db.get(User, normal.id)
        db_user.last_seen_at = now - datetime.timedelta(minutes=2)
        await db.commit()

    app, client = await _client_for(admin)
    async with client:
        response = await client.get("/v1/admin/overview")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["data"]["online_users_estimate"] >= 1
    assert response.json()["data"]["total_subscription_plans"] == 4
    assert response.json()["data"]["total_active_subscriptions"] >= 1
