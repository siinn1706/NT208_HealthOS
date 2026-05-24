"""Service-level RBAC tests — requires real Postgres at settings.database_url."""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import User
from app.models.rbac import Permission, Role, RolePermission, UserRole
from app.services import rbac as rbac_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


def _rand_email() -> str:
    return f"rbac-test-{uuid.uuid4().hex[:8]}@test.local"


async def _create_user(db, *, email: str | None = None) -> User:
    u = User(
        email=email or _rand_email(),
        username=f"rbactest_{uuid.uuid4().hex[:8]}",
        display_name="RBAC Test",
        hashed_password="x",
        has_password=True,
    )
    db.add(u)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def pg_db():
    """Open a fresh AsyncSession; yield it; rollback-clean created user IDs on teardown."""
    created_user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        try:
            yield db, created_user_ids
        finally:
            pass
    # Cleanup after session closes to avoid nested-session conflicts.
    if created_user_ids:
        async with AsyncSessionLocal() as cleanup:
            await cleanup.execute(delete(User).where(User.id.in_(created_user_ids)))
            await cleanup.commit()
    await engine.dispose()


async def _ensure_defaults(db) -> None:
    await rbac_service.ensure_default_roles_and_permissions(db, commit=True)


# ── Tests ─────────────────────────────────────────────────────────────────────


async def test_ensure_defaults_creates_roles_and_permissions(pg_db):
    db, _ = pg_db
    await _ensure_defaults(db)

    roles = (await db.execute(select(Role))).scalars().all()
    perms = (await db.execute(select(Permission))).scalars().all()
    admin_role = next(r for r in roles if r.code == rbac_service.DEFAULT_ROLE_ADMIN)
    rp = (await db.execute(
        select(RolePermission).where(RolePermission.role_id == admin_role.id)
    )).scalars().all()

    role_codes = {r.code for r in roles}
    assert rbac_service.DEFAULT_ROLE_USER in role_codes
    assert rbac_service.DEFAULT_ROLE_ADMIN in role_codes
    assert len(perms) >= len(rbac_service.DEFAULT_PERMISSIONS)
    assert len(rp) == len(rbac_service.ADMIN_PERMISSIONS)

    # Idempotent: second call changes nothing.
    await _ensure_defaults(db)
    roles2 = (await db.execute(select(Role))).scalars().all()
    assert {r.code for r in roles2} == role_codes


async def test_has_role_normal_vs_admin(pg_db):
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    await db.commit()

    assert not await rbac_service.has_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    assert await rbac_service.has_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)


async def test_has_permission_through_admin_role(pg_db):
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    normal = await _create_user(db)
    ids.append(normal.id)
    await db.commit()

    assert not await rbac_service.has_permission(db, normal.id, "admin.access")

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    assert await rbac_service.has_permission(db, u.id, "admin.access")
    assert not await rbac_service.has_permission(db, normal.id, "admin.access")


async def test_has_role_excludes_soft_deleted(pg_db):
    """Soft-deleted user with retained user_roles row must NOT pass has_role (Red Team #1)."""
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    await db.commit()

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    assert await rbac_service.has_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)

    # Soft-delete the user.
    u.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()

    assert not await rbac_service.has_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)


async def test_is_admin_user(pg_db):
    from app.core.rbac_deps import is_admin_user
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    await db.commit()

    assert not await is_admin_user(u, db)

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    assert await is_admin_user(u, db)


async def test_grant_role_idempotent_single_audit_row(pg_db):
    """grant_role twice: one user_roles row, one audit_log row (Red Team #11)."""
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    await db.commit()

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    # Second call — idempotent, no new audit_log.
    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    ur_rows = (await db.execute(
        select(UserRole).where(UserRole.user_id == u.id)
    )).scalars().all()
    audit_rows = (await db.execute(
        select(AuditLog)
        .where(AuditLog.event_type == AuditEventTypeEnum.RBAC_ROLE_GRANTED)
        .where(AuditLog.details["target_user_id"].as_string() == str(u.id))
    )).scalars().all()

    assert len(ur_rows) == 1
    assert len(audit_rows) == 1


async def test_list_user_permissions(pg_db):
    db, ids = pg_db
    await _ensure_defaults(db)
    u = await _create_user(db)
    ids.append(u.id)
    await db.commit()

    # No permissions for user without role.
    perms = await rbac_service.list_user_permissions(db, u.id)
    assert isinstance(perms, set)
    assert "admin.access" not in perms

    await rbac_service.grant_role(db, u.id, rbac_service.DEFAULT_ROLE_ADMIN)
    await db.commit()

    perms = await rbac_service.list_user_permissions(db, u.id)
    for code in rbac_service.ADMIN_PERMISSIONS:
        assert code in perms
