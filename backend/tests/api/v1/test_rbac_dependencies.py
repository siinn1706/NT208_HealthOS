"""FastAPI dependency gating tests: require_role, require_permission — real Postgres."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.adapters.database import AsyncSessionLocal, engine, get_db
from app.core.security import get_current_user
from app.models.core import User
from app.services import rbac as rbac_service

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


def _stub_user(user_id: uuid.UUID) -> SimpleNamespace:
    return SimpleNamespace(
        id=user_id,
        email=f"rbac-dep-{user_id.hex[:8]}@test.local",
        username=f"rbacdep_{user_id.hex[:8]}",
        display_name="Dep Test",
        onboarding_status="completed",
        onboarding_completed_at=None,
        created_at=datetime.now(timezone.utc),
        profile=None,
        deleted_at=None,
    )


@pytest_asyncio.fixture
async def setup_rbac():
    """Ensure default roles+permissions seeded; yield; no teardown needed (idempotent data)."""
    async with AsyncSessionLocal() as db:
        await rbac_service.ensure_default_roles_and_permissions(db, commit=True)


@pytest_asyncio.fixture
async def normal_user_id(setup_rbac):
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        db.add(User(
            id=uid,
            email=f"normal-dep-{uid.hex[:8]}@test.local",
            username=f"normaldep_{uid.hex[:8]}",
            display_name="Normal",
            hashed_password="x",
            has_password=True,
        ))
        await db.commit()
    yield uid
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.id == uid))
        await db.commit()
    await engine.dispose()


@pytest_asyncio.fixture
async def admin_user_id(setup_rbac):
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        db.add(User(
            id=uid,
            email=f"admin-dep-{uid.hex[:8]}@test.local",
            username=f"admindep_{uid.hex[:8]}",
            display_name="Admin",
            hashed_password="x",
            has_password=True,
        ))
        await db.commit()
    async with AsyncSessionLocal() as db:
        await rbac_service.grant_role(db, uid, rbac_service.DEFAULT_ROLE_ADMIN)
        await db.commit()
    yield uid
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.id == uid))
        await db.commit()
    await engine.dispose()


def _build_client(user_id: uuid.UUID):
    """Build an AsyncClient with get_current_user overridden to return the given user_id."""
    from app.main import app

    stub = _stub_user(user_id)

    async def _override_user():
        return stub

    async def _override_db():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_db] = _override_db
    return app


async def _get(user_id: uuid.UUID, path: str) -> int:
    """Make a GET request using the real PG session, return status code."""
    from app.main import app
    from app.core.rbac_deps import require_role, require_permission
    from fastapi import APIRouter

    # Build a mini test router with guarded stubs.
    router = APIRouter()

    @router.get("/__rbac_test__/role")
    async def _role_gate(_u=__import__("fastapi", fromlist=["Depends"]).Depends(require_role("admin"))):
        return {"ok": True}

    @router.get("/__rbac_test__/perm")
    async def _perm_gate(_u=__import__("fastapi", fromlist=["Depends"]).Depends(require_permission("admin.access"))):
        return {"ok": True}

    app.include_router(router)

    stub = _stub_user(user_id)

    async def _override_user():
        return stub

    async def _override_db():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_db] = _override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(path)

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_db, None)
    return res.status_code, res.json()


async def test_require_role_blocks_normal_user(normal_user_id):
    status, body = await _get(normal_user_id, "/__rbac_test__/role")
    assert status == 403
    assert body["detail"]["code"] == "FORBIDDEN"


async def test_require_role_allows_admin_user(admin_user_id):
    status, _ = await _get(admin_user_id, "/__rbac_test__/role")
    assert status == 200


async def test_require_permission_blocks_normal_user(normal_user_id):
    status, body = await _get(normal_user_id, "/__rbac_test__/perm")
    assert status == 403
    assert body["detail"]["code"] == "FORBIDDEN"


async def test_require_permission_allows_admin_user(admin_user_id):
    status, _ = await _get(admin_user_id, "/__rbac_test__/perm")
    assert status == 200
