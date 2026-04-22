"""Focused tests for PATCH /v1/users/me explicit null clears (profile field clearing)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.main import app


@pytest_asyncio.fixture
async def profile_patch_client():
    user_id = uuid.uuid4()
    profile = SimpleNamespace(
        user_id=user_id,
        full_name="Test User",
        phone="+15551234567",
        address="123 Lane",
        blood_type="A+",
        emergency_contacts=[{"name": "Mom", "phone": "+15550001111", "relationship": "Parent"}],
        avatar_url=None,
        date_of_birth=None,
        gender=None,
        height_cm=None,
        weight_kg=None,
        medical_info=None,
    )
    user = SimpleNamespace(
        id=user_id,
        email="patch@example.com",
        username="patchuser",
        display_name="Test User",
        onboarding_status="in_progress",
        onboarding_completed_at=None,
        created_at=datetime.now(timezone.utc),
        profile=profile,
    )

    class _ExecResult:
        def __init__(self, p):
            self._p = p

        def scalar_one_or_none(self):
            return self._p

    class _FakeSession:
        def __init__(self, p):
            self.profile = p

        async def execute(self, _stmt):
            return _ExecResult(self.profile)

        def add(self, _obj):
            return None

        async def flush(self):
            return None

        async def commit(self):
            return None

        async def refresh(self, _obj):
            return None

    session = _FakeSession(profile)

    async def override_user():
        return user

    async def override_db():
        yield session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, profile
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_patch_me_null_clears_optional_profile_fields(profile_patch_client):
    client, profile = profile_patch_client
    res = await client.patch(
        "/v1/users/me",
        json={
            "phone": None,
            "address": None,
            "blood_type": None,
            "emergency_contacts": None,
        },
    )
    assert res.status_code == 200
    body = res.json()["data"]
    assert body["phone"] is None
    assert body["address"] is None
    assert body["blood_type"] is None
    assert body["emergency_contacts"] in (None, [])
    assert profile.phone is None
    assert profile.address is None
    assert profile.blood_type is None
    assert profile.emergency_contacts is None
