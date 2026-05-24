from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select

from app.adapters.database import AsyncSessionLocal, engine
from app.models.core import User
from app.models.rbac import UserRole
from app.models.subscriptions import SubscriptionPlan, UserSubscription
from app.schemas.auth import OAuthProfile
from app.services import auth as auth_service
from app.services import subscriptions as subscription_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


async def _create_user(db, *, email: str | None = None) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=email or f"subsvc-{user_id.hex[:8]}@test.local",
        username=f"subsvc_{user_id.hex[:8]}",
        display_name="Subscription Service Test",
        hashed_password="x",
        has_password=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def pg_db():
    created_user_ids: list[uuid.UUID] = []
    created_plan_codes: list[str] = []
    async with AsyncSessionLocal() as db:
        yield db, created_user_ids, created_plan_codes

    async with AsyncSessionLocal() as cleanup:
        if created_user_ids:
            await cleanup.execute(delete(UserSubscription).where(UserSubscription.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(UserRole).where(UserRole.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(User).where(User.id.in_(created_user_ids)))
        if created_plan_codes:
            await cleanup.execute(delete(SubscriptionPlan).where(SubscriptionPlan.code.in_(created_plan_codes)))
        await cleanup.commit()
    await engine.dispose()


async def test_default_subscription_plans_seed_idempotently(pg_db):
    db, _user_ids, _plan_codes = pg_db

    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await db.commit()

    rows = (
        await db.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.code.in_(["free", "basic", "family", "professional"])
            )
        )
    ).scalars().all()
    by_code = {plan.code: plan for plan in rows}

    assert set(by_code) == {"free", "basic", "family", "professional"}
    assert by_code["free"].price_vnd == 0
    assert by_code["free"].billing_period == "free"
    assert by_code["free"].limits["medical_records"] == 20
    assert by_code["basic"].price_vnd == 99000
    assert by_code["basic"].is_recommended is True
    assert by_code["family"].limits["family_members"] == 5
    assert by_code["professional"].limits["doctor_consultations_per_month"] == 4

    duplicate_count = (
        await db.execute(
            select(func.count(SubscriptionPlan.id)).where(
                SubscriptionPlan.code.in_(["free", "basic", "family", "professional"])
            )
        )
    ).scalar_one()
    assert duplicate_count == 4


async def test_default_seed_updates_conflicting_default_code_to_canonical_values(pg_db):
    db, _user_ids, _plan_codes = pg_db
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    free = (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == "free"))
    ).scalar_one()
    free.name_vi = "Wrong"
    free.price_vnd = 123
    free.features_vi = ["wrong"]
    free.limits = {"wrong": True}
    await db.commit()

    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await db.commit()
    updated = (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == "free"))
    ).scalar_one()

    assert updated.name_vi == "Miễn phí"
    assert updated.price_vnd == 0
    assert updated.features_vi == [
        "Hồ sơ y tế cơ bản (20 hồ sơ)",
        "Nhật ký dinh dưỡng (30 ngày lịch sử)",
        "Theo dõi bước chân & calo",
        "Cảnh báo thuốc (3 nhắc nhở)",
        "Kết nối 1 wearable",
    ]
    assert updated.limits["api_access"] is False


async def test_default_seed_preserves_manual_non_default_plans(pg_db):
    db, _user_ids, plan_codes = pg_db
    manual_code = f"manual-{uuid.uuid4().hex[:8]}"
    plan_codes.append(manual_code)
    db.add(
        SubscriptionPlan(
            code=manual_code,
            name_vi="Manual",
            name_en="Manual",
            price_vnd=42000,
            billing_period="monthly",
            features_vi=["Manual feature"],
            limits={"manual": True},
            is_active=True,
        )
    )
    await db.commit()

    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await db.commit()

    manual = (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == manual_code))
    ).scalar_one_or_none()
    assert manual is not None
    assert manual.name_vi == "Manual"
    assert manual.price_vnd == 42000


async def test_legacy_user_without_subscription_resolves_to_virtual_free_without_writing(pg_db):
    db, user_ids, _plan_codes = pg_db
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    user = await _create_user(db)
    user_ids.append(user.id)
    await db.commit()

    summary = await subscription_service.get_user_subscription_summary(db, user.id)

    assert summary.subscription_id is None
    assert summary.status == "active"
    assert summary.plan.code == "free"
    assert summary.limits["medical_records"] == 20
    row_count = (
        await db.execute(
            select(func.count(UserSubscription.id)).where(UserSubscription.user_id == user.id)
        )
    ).scalar_one()
    assert row_count == 0


async def test_new_oauth_user_gets_real_free_subscription(pg_db):
    db, user_ids, _plan_codes = pg_db
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    email = f"oauth-sub-{uuid.uuid4().hex[:8]}@test.local"

    user = await auth_service.get_or_create_user_from_oauth(
        OAuthProfile(
            provider="otp",
            provider_account_id=email,
            email=email,
            name="OAuth Sub User",
            avatar_url=None,
        ),
        db,
    )
    user_ids.append(user.id)
    await db.commit()

    subscription = (
        await db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user.id)
        )
    ).scalar_one()
    plan = await db.get(SubscriptionPlan, subscription.plan_id)

    assert subscription.status == "active"
    assert plan is not None
    assert plan.code == "free"
