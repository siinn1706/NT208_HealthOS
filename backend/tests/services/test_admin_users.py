from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import RefreshTokenSession, User, UserProfile
from app.models.rbac import UserRole
from app.models.subscriptions import UserSubscription
from app.services import rbac as rbac_service
from app.services import subscriptions as subscription_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


async def _create_user(db, *, email: str | None = None, is_system: bool = False) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=email or f"admin-svc-{user_id.hex[:8]}@test.local",
        username=f"adminsvc_{user_id.hex[:8]}",
        display_name="Admin Service Test",
        hashed_password="x",
        has_password=True,
        is_system=is_system,
    )
    db.add(user)
    await db.flush()
    db.add(UserProfile(user_id=user.id, full_name=user.display_name))
    await db.flush()
    return user


@pytest_asyncio.fixture
async def pg_db():
    created_user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        yield db, created_user_ids
    if created_user_ids:
        async with AsyncSessionLocal() as cleanup:
            await cleanup.execute(delete(UserSubscription).where(UserSubscription.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(UserRole).where(UserRole.user_id.in_(created_user_ids)))
            await cleanup.execute(delete(User).where(User.id.in_(created_user_ids)))
            await cleanup.commit()
    await engine.dispose()


async def test_overview_counts_human_users_and_online_estimate(pg_db):
    from app.services import admin as admin_service

    db, ids = pg_db
    now = datetime.datetime.now(datetime.timezone.utc)
    active = await _create_user(db)
    online = await _create_user(db)
    banned = await _create_user(db)
    deleted = await _create_user(db)
    system = await _create_user(db, is_system=True)
    ids.extend([active.id, online.id, banned.id, deleted.id, system.id])
    online.last_seen_at = now - datetime.timedelta(minutes=2)
    active.last_seen_at = now - datetime.timedelta(minutes=20)
    banned.banned_at = now
    banned.banned_reason = "policy"
    deleted.deleted_at = now
    system.last_seen_at = now
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await subscription_service.ensure_user_default_subscription(db, active.id)
    await db.commit()

    overview = await admin_service.get_admin_overview(db, now=now)

    assert overview.total_users == 4
    assert overview.active_users == 2
    assert overview.banned_users == 1
    assert overview.soft_deleted_users == 1
    assert overview.online_users_estimate == 1
    assert overview.total_subscription_plans == 4
    assert overview.total_active_subscriptions == 1


async def test_ban_user_invalidates_sessions_and_writes_audit(pg_db):
    from app.services import admin as admin_service

    db, ids = pg_db
    actor = await _create_user(db)
    target = await _create_user(db)
    ids.extend([actor.id, target.id])
    refresh = RefreshTokenSession(
        user_id=target.id,
        token_hash=uuid.uuid4().hex + uuid.uuid4().hex,
        family_id=uuid.uuid4(),
        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
    )
    db.add(refresh)
    await db.commit()

    banned = await admin_service.ban_user(
        db,
        actor=actor,
        target_user_id=target.id,
        reason="terms violation",
        banned_until=None,
        request=None,
    )
    await db.commit()

    assert banned.banned_at is not None
    assert banned.banned_reason == "terms violation"
    assert banned.banned_by_id == actor.id
    assert banned.tokens_invalidated_at is not None

    refreshed_session = (
        await db.execute(select(RefreshTokenSession).where(RefreshTokenSession.id == refresh.id))
    ).scalar_one()
    assert refreshed_session.revoked_at is not None

    audit_rows = (
        await db.execute(
            select(AuditLog)
            .where(AuditLog.event_type == AuditEventTypeEnum.ADMIN_USER_BANNED)
            .where(AuditLog.details["target_user_id"].as_string() == str(target.id))
        )
    ).scalars().all()
    assert len(audit_rows) == 1
    assert audit_rows[0].details["reason_length"] == len("terms violation")
    assert "terms violation" not in str(audit_rows[0].details)


async def test_unban_user_clears_ban_without_resetting_token_cutoff(pg_db):
    from app.services import admin as admin_service

    db, ids = pg_db
    actor = await _create_user(db)
    target = await _create_user(db)
    ids.extend([actor.id, target.id])
    cutoff = datetime.datetime.now(datetime.timezone.utc)
    target.banned_at = cutoff
    target.banned_reason = "policy"
    target.banned_by_id = actor.id
    target.tokens_invalidated_at = cutoff
    await db.commit()

    unbanned = await admin_service.unban_user(
        db,
        actor=actor,
        target_user_id=target.id,
        request=None,
    )
    await db.commit()

    assert unbanned.banned_at is None
    assert unbanned.banned_reason is None
    assert unbanned.banned_by_id is None
    assert unbanned.banned_until is None
    assert unbanned.tokens_invalidated_at == cutoff

    audit_rows = (
        await db.execute(
            select(AuditLog)
            .where(AuditLog.event_type == AuditEventTypeEnum.ADMIN_USER_UNBANNED)
            .where(AuditLog.details["target_user_id"].as_string() == str(target.id))
        )
    ).scalars().all()
    assert len(audit_rows) == 1


async def test_admin_user_list_includes_roles_and_null_subscription(pg_db):
    from app.services import admin as admin_service

    db, ids = pg_db
    await rbac_service.ensure_default_roles_and_permissions(db, commit=False)
    user = await _create_user(db, email="list-admin-user@test.local")
    ids.append(user.id)
    await rbac_service.grant_role(db, user.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await subscription_service.seed_default_subscription_plans(db, commit=False)
    await subscription_service.ensure_user_default_subscription(db, user.id)
    await db.commit()

    items, meta = await admin_service.list_users(
        db,
        q="list-admin-user",
        status_filter="all",
        page=1,
        per_page=20,
        sort="email_asc",
    )

    matching = [item for item in items if item.id == user.id]
    assert len(matching) == 1
    assert matching[0].roles == ["admin"]
    assert matching[0].current_subscription is not None
    assert matching[0].current_subscription.plan_code == "free"
    assert meta.total >= 1
