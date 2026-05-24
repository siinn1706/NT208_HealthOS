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
from app.models.subscriptions import SubscriptionPlan, UserSubscription
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
async def subscription_api_state():
    created_user_ids: list[uuid.UUID] = []
    created_plan_codes: list[str] = []
    async with AsyncSessionLocal() as db:
        await rbac_service.ensure_default_roles_and_permissions(db, commit=False)
        await subscription_service.seed_default_subscription_plans(db, commit=False)
        admin = await _create_user(db, email_prefix="subapi-admin")
        normal = await _create_user(db, email_prefix="subapi-normal")
        created_user_ids.extend([admin.id, normal.id])
        await db.commit()
        await rbac_service.grant_role(db, admin.id, rbac_service.DEFAULT_ROLE_ADMIN)
        await db.commit()
        yield admin, normal, created_user_ids, created_plan_codes

    async with AsyncSessionLocal() as cleanup:
        if created_user_ids:
            await cleanup.execute(delete(UserSubscription).where(UserSubscription.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(UserRole).where(UserRole.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(User).where(User.id.in_(created_user_ids)))
        if created_plan_codes:
            await cleanup.execute(delete(SubscriptionPlan).where(SubscriptionPlan.code.in_(created_plan_codes)))
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
async def test_public_subscription_plan_catalog_lists_active_defaults(subscription_api_state):
    app, client = await _client_for(None)
    async with client:
        response = await client.get("/v1/subscription-plans")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert [plan["code"] for plan in data[:4]] == ["free", "basic", "family", "professional"]
    assert data[0]["features_vi"][0] == "Hồ sơ y tế cơ bản (20 hồ sơ)"
    assert data[1]["is_recommended"] is True


@pytest.mark.asyncio
async def test_user_can_read_own_subscription_with_free_fallback(subscription_api_state):
    _admin, normal, _ids, _plan_codes = subscription_api_state
    app, client = await _client_for(normal)
    async with client:
        response = await client.get("/v1/subscription/me")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["subscription_id"] is None
    assert data["status"] == "active"
    assert data["plan"]["code"] == "free"
    assert data["limits"]["medical_records"] == 20


@pytest.mark.asyncio
async def test_admin_can_list_create_and_update_subscription_plans(subscription_api_state):
    admin, _normal, _ids, plan_codes = subscription_api_state
    plan_code = f"api-custom-{uuid.uuid4().hex[:8]}"
    plan_codes.append(plan_code)
    app, client = await _client_for(admin)
    async with client:
        list_response = await client.get("/v1/admin/subscription-plans")
        create_response = await client.post(
            "/v1/admin/subscription-plans",
            json={
                "code": plan_code,
                "name_vi": "Gói thử nghiệm",
                "name_en": "Test plan",
                "price_vnd": 123000,
                "billing_period": "monthly",
                "features_vi": ["Feature A"],
                "limits": {"feature_a": True},
                "is_active": True,
                "sort_order": 90,
            },
        )
        created_id = create_response.json()["data"]["id"]
        patch_response = await client.patch(
            f"/v1/admin/subscription-plans/{created_id}",
            json={"price_vnd": 124000, "is_active": False},
        )
    app.dependency_overrides.clear()

    assert list_response.status_code == 200
    assert "free" in [plan["code"] for plan in list_response.json()["data"]]
    assert create_response.status_code == 201
    assert create_response.json()["data"]["code"] == plan_code
    assert patch_response.status_code == 200
    assert patch_response.json()["data"]["price_vnd"] == 124000
    assert patch_response.json()["data"]["is_active"] is False


@pytest.mark.asyncio
async def test_admin_can_assign_and_cancel_user_subscription(subscription_api_state):
    admin, normal, _ids, _plan_codes = subscription_api_state
    expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)).isoformat()
    app, client = await _client_for(admin)
    async with client:
        assign_response = await client.patch(
            f"/v1/admin/users/{normal.id}/subscription",
            json={
                "plan_code": "basic",
                "status": "active",
                "expires_at": expires_at,
                "admin_note": "demo upgrade",
            },
        )
        cancel_response = await client.patch(
            f"/v1/admin/users/{normal.id}/subscription",
            json={"status": "canceled", "admin_note": "demo cancel"},
        )
    app.dependency_overrides.clear()

    assert assign_response.status_code == 200
    assigned = assign_response.json()["data"]
    assert assigned["subscription_id"] is not None
    assert assigned["status"] == "active"
    assert assigned["plan"]["code"] == "basic"

    assert cancel_response.status_code == 200
    canceled = cancel_response.json()["data"]
    assert canceled["status"] == "canceled"
    assert canceled["plan"]["code"] == "basic"


@pytest.mark.asyncio
async def test_normal_user_cannot_access_admin_subscription_apis(subscription_api_state):
    _admin, normal, _ids, _plan_codes = subscription_api_state
    app, client = await _client_for(normal)
    async with client:
        response = await client.get("/v1/admin/subscription-plans")
    app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_cannot_assign_inactive_subscription_plan(subscription_api_state):
    admin, normal, _ids, plan_codes = subscription_api_state
    plan_code = f"inactive-{uuid.uuid4().hex[:8]}"
    plan_codes.append(plan_code)
    async with AsyncSessionLocal() as db:
        db.add(
            SubscriptionPlan(
                code=plan_code,
                name_vi="Inactive",
                name_en="Inactive",
                price_vnd=1000,
                billing_period="monthly",
                features_vi=["Inactive feature"],
                limits={},
                is_active=False,
            )
        )
        await db.commit()

    app, client = await _client_for(admin)
    async with client:
        response = await client.patch(
            f"/v1/admin/users/{normal.id}/subscription",
            json={"plan_code": plan_code, "status": "active"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INACTIVE_SUBSCRIPTION_PLAN"
