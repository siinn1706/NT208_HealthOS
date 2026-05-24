"""Behavioural tests for delete_seed_admin.py flag semantics (Red Team #7)."""
from __future__ import annotations

import sys
import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import delete_seed_admin

from app.adapters.database import AsyncSessionLocal, engine
from app.models.core import User
from app.models.rbac import UserRole
from app.services import rbac as rbac_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


async def _ensure_defaults() -> None:
    async with AsyncSessionLocal() as db:
        await rbac_service.ensure_default_roles_and_permissions(db, commit=True)


async def _create_admin_user() -> tuple[uuid.UUID, str]:
    email = f"del-test-{uuid.uuid4().hex[:8]}@test.local"
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        db.add(User(
            id=uid,
            email=email,
            username=f"deltest_{uid.hex[:8]}",
            display_name="Del Test",
            hashed_password="x",
            has_password=True,
        ))
        await db.commit()
    async with AsyncSessionLocal() as db:
        await rbac_service.grant_role(db, uid, rbac_service.DEFAULT_ROLE_ADMIN)
        await db.commit()
    return uid, email


async def _cleanup(uid: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.id == uid))
        await db.commit()
    await engine.dispose()


async def test_no_flags_exits_nonzero(monkeypatch):
    """No flags → usage message + SystemExit non-zero (Red Team #7)."""
    monkeypatch.setenv("SEED_ADMIN_EMAIL", f"noflags-{uuid.uuid4().hex[:8]}@test.local")

    with pytest.raises(SystemExit) as exc:
        await delete_seed_admin.run(confirm=False, revoke_role_only=False)
    assert exc.value.code != 0


async def test_confirm_deletes_user_row(monkeypatch):
    """--confirm deletes the user row (legacy contract preserved)."""
    await _ensure_defaults()
    uid, email = await _create_admin_user()
    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)

    try:
        await delete_seed_admin.run(confirm=True, revoke_role_only=False)

        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        assert user is None, "User row should have been deleted"
    except Exception:
        await _cleanup(uid)
        raise


async def test_revoke_role_removes_admin_role_keeps_user(monkeypatch):
    """--revoke-role removes admin role but keeps user row (Red Team #7)."""
    await _ensure_defaults()
    uid, email = await _create_admin_user()
    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)

    try:
        await delete_seed_admin.run(confirm=False, revoke_role_only=True)

        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            assert user is not None, "User row must survive --revoke-role"

            ur = (await db.execute(
                select(UserRole).where(UserRole.user_id == uid)
            )).scalars().all()
            assert len(ur) == 0, "Admin role must be revoked"
    finally:
        await _cleanup(uid)
