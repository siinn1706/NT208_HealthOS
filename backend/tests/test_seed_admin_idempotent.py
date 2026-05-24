"""Seed script idempotency tests — requires real Postgres at settings.database_url."""
from __future__ import annotations

import sys
import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select, func

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import seed_admin

from app.adapters.database import AsyncSessionLocal, engine
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import User, UserProfile
from app.models.rbac import Permission, Role, UserRole
from app.services import rbac as rbac_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


async def _cleanup_emails(emails: list[str]) -> None:
    async with AsyncSessionLocal() as db:
        for email in emails:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if user:
                await db.execute(delete(User).where(User.id == user.id))
        await db.commit()
    await engine.dispose()


async def test_seed_idempotent_single_email(monkeypatch):
    """Running seed twice yields exactly 1 user row and 1 user_roles row."""
    email = f"seed-idem-{uuid.uuid4().hex[:8]}@test.local"
    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)
    monkeypatch.delenv("SEED_ADMIN_EMAILS", raising=False)
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "TestPassword1!")

    try:
        await seed_admin.seed()
        await seed_admin.seed()  # second run — idempotent

        async with AsyncSessionLocal() as db:
            users = (await db.execute(select(User).where(User.email == email))).scalars().all()
            assert len(users) == 1, "Exactly one user row expected"

            ur_rows = (await db.execute(
                select(UserRole).where(UserRole.user_id == users[0].id)
            )).scalars().all()
            assert len(ur_rows) == 1, "Exactly one user_roles row expected"

            roles = (await db.execute(select(Role))).scalars().all()
            role_codes = {r.code for r in roles}
            assert "user" in role_codes
            assert "admin" in role_codes

            perm_count = (await db.execute(select(func.count(Permission.id)))).scalar()
            assert perm_count >= len(rbac_service.DEFAULT_PERMISSIONS)
    finally:
        await _cleanup_emails([email])


async def test_seed_multi_email(monkeypatch):
    """Two distinct emails both get admin role."""
    ea = f"seed-multi-a-{uuid.uuid4().hex[:8]}@test.local"
    eb = f"seed-multi-b-{uuid.uuid4().hex[:8]}@test.local"
    monkeypatch.delenv("SEED_ADMIN_EMAIL", raising=False)
    monkeypatch.setenv("SEED_ADMIN_EMAILS", f"{ea},{eb}")
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "TestPassword1!")

    try:
        await seed_admin.seed()

        async with AsyncSessionLocal() as db:
            for email in [ea, eb]:
                user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
                assert user is not None, f"{email} should exist"
                ur = (await db.execute(select(UserRole).where(UserRole.user_id == user.id))).scalars().all()
                assert len(ur) == 1, f"{email} should have admin role"
    finally:
        await _cleanup_emails([ea, eb])


async def test_seed_mixed_case_deduplication(monkeypatch):
    """Mixed-case and lowercase variants of same email dedupe to one user (Red Team #5)."""
    base = f"seed-case-{uuid.uuid4().hex[:8]}"
    ea = f"{base.upper()}@TEST.LOCAL"
    eb = f"{base.lower()}@test.local"
    monkeypatch.delenv("SEED_ADMIN_EMAIL", raising=False)
    monkeypatch.setenv("SEED_ADMIN_EMAILS", f"{ea},{eb}")
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "TestPassword1!")

    try:
        await seed_admin.seed()

        async with AsyncSessionLocal() as db:
            users = (await db.execute(
                select(User).where(User.email == eb)
            )).scalars().all()
            assert len(users) == 1, "Mixed-case emails must dedupe to one row"
    finally:
        await _cleanup_emails([eb])


async def test_seed_reserved_username_admin_email(monkeypatch):
    """Email with local-part 'admin' yields username 'admin_seed' not 'admin' (Red Team #8)."""
    email = f"admin@seed-reserved-{uuid.uuid4().hex[:8]}.local"
    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)
    monkeypatch.delenv("SEED_ADMIN_EMAILS", raising=False)
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "TestPassword1!")

    try:
        await seed_admin.seed()

        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            assert user.username == "admin_seed", f"Expected 'admin_seed', got '{user.username}'"
    finally:
        await _cleanup_emails([email])


async def test_seed_username_collision_same_local_part(monkeypatch):
    """Two emails with same local part get distinct usernames (Red Team #9)."""
    local = f"alice{uuid.uuid4().hex[:6]}"
    ea = f"{local}@domain1.local"
    eb = f"{local}@domain2.local"
    monkeypatch.delenv("SEED_ADMIN_EMAIL", raising=False)
    monkeypatch.setenv("SEED_ADMIN_EMAILS", f"{ea},{eb}")
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "TestPassword1!")

    try:
        await seed_admin.seed()

        async with AsyncSessionLocal() as db:
            ua = (await db.execute(select(User).where(User.email == ea))).scalar_one()
            ub = (await db.execute(select(User).where(User.email == eb))).scalar_one()
            assert ua.username != ub.username, "Same-local-part emails must get distinct usernames"
    finally:
        await _cleanup_emails([ea, eb])


async def test_seed_missing_password_new_email_exits_nonzero(monkeypatch):
    """New email without SEED_ADMIN_PASSWORD must raise SystemExit with non-zero code."""
    email = f"seed-nopw-{uuid.uuid4().hex[:8]}@test.local"
    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)
    monkeypatch.delenv("SEED_ADMIN_EMAILS", raising=False)
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)

    with pytest.raises(SystemExit) as exc:
        await seed_admin.seed()
    assert exc.value.code != 0


async def test_seed_existing_user_no_profile_creates_profile(monkeypatch):
    """Pre-existing user without UserProfile gets a profile row on seed (Red Team existing-user gap)."""
    email = f"seed-noprofile-{uuid.uuid4().hex[:8]}@test.local"
    uid = uuid.uuid4()

    async with AsyncSessionLocal() as db:
        db.add(User(
            id=uid,
            email=email,
            username=f"noprofile_{uid.hex[:8]}",
            display_name="No Profile",
            hashed_password="x",
            has_password=True,
        ))
        await db.commit()

    monkeypatch.setenv("SEED_ADMIN_EMAIL", email)
    monkeypatch.delenv("SEED_ADMIN_EMAILS", raising=False)
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)

    try:
        await seed_admin.seed()

        async with AsyncSessionLocal() as db:
            profile = (await db.execute(
                select(UserProfile).where(UserProfile.user_id == uid)
            )).scalar_one_or_none()
            assert profile is not None, "Profile should have been created during seed"
    finally:
        await _cleanup_emails([email])
