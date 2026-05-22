"""Integration tests proving the get_db transaction safety refactor.

Requires a live Postgres DB at settings.database_url.

Test 1: get_db does NOT auto-commit.
  A probe route mutates User.display_name without calling commit(). After the
  request a fresh session must still see the original value.

Test 2: explicit-commit write path still persists.
  PATCH /v1/preferences/me commits explicitly; a fresh session confirms the row.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import APIRouter, Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal, engine, get_db
from app.core.security import get_current_user
from app.main import app
from app.models.core import User, UserPreference


pytestmark = pytest.mark.asyncio


# ── Probe router ─────────────────────────────────────────────────────────────
# Test-only route: mutates User.display_name WITHOUT committing.
# Exercises the real get_db dependency lifecycle — not a mock override.

_probe_router = APIRouter()


@_probe_router.post("/__test__/uncommitted-mutation/{user_id}")
async def _probe_uncommitted_mutation(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, uuid.UUID(user_id))
    if user is None:
        return {"ok": False}
    user.display_name = "tampered-no-commit"  # intentionally NO commit
    return {"ok": True}


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def transient_user():
    """Create a throwaway User row; delete on teardown."""
    user_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        user = User(
            id=user_id,
            email=f"txsafety-{user_id.hex[:8]}@test",
            username=f"txsafety_{user_id.hex[:8]}",
            display_name="original",
            hashed_password="x",
        )
        db.add(user)
        await db.commit()

    try:
        yield user_id
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
        await engine.dispose()


@pytest_asyncio.fixture
async def probe_client(transient_user):
    """Mount the probe router; remove it after the test."""
    app.include_router(_probe_router)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, transient_user
    app.router.routes = [
        r for r in app.router.routes
        if getattr(r, "path", "") != "/__test__/uncommitted-mutation/{user_id}"
    ]


# ── Test 1 ────────────────────────────────────────────────────────────────────

async def test_get_db_does_not_persist_uncommitted_mutation(probe_client):
    """Mutation without explicit commit must NOT land in DB after the request."""
    client, user_id = probe_client

    res = await client.post(f"/__test__/uncommitted-mutation/{user_id}")
    assert res.status_code == 200
    assert res.json().get("ok") is True

    async with AsyncSessionLocal() as fresh:
        reloaded = await fresh.get(User, user_id)
        assert reloaded is not None
        assert reloaded.display_name == "original", (
            f"get_db must NOT auto-commit: expected 'original', got {reloaded.display_name!r}"
        )


# ── Test 2 ────────────────────────────────────────────────────────────────────

async def test_explicit_commit_write_endpoint_persists(transient_user):
    """PATCH /v1/preferences/me commits explicitly; fresh session sees the new row."""
    user_id = transient_user
    fake_user = SimpleNamespace(id=user_id)

    async def _override_user():
        return fake_user

    app.dependency_overrides[get_current_user] = _override_user
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.patch("/v1/preferences/me", json={"locale": "vi"})
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()

    async with AsyncSessionLocal() as fresh:
        row = (
            await fresh.execute(
                select(UserPreference).where(UserPreference.user_id == user_id)
            )
        ).scalar_one_or_none()
        assert row is not None, "UserPreference row must exist after explicit commit"
        assert row.locale == "vi", f"Expected locale='vi', got {row.locale!r}"
