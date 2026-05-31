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

        def scalar_one(self):
            return self._p

    class _FakeSession:
        def __init__(self, p, u):
            self.profile = p
            self.user = u
            self._execute_count = 0

        async def execute(self, _stmt):
            self._execute_count += 1
            return _ExecResult(self.profile if self._execute_count == 1 else self.user)

        def add(self, _obj):
            return None

        async def flush(self):
            return None

        async def commit(self):
            return None

        async def refresh(self, _obj):
            return None

    session = _FakeSession(profile, user)

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


@pytest.mark.asyncio
async def test_patch_me_rejects_null_full_name(profile_patch_client):
    client, profile = profile_patch_client
    res = await client.patch("/v1/users/me", json={"full_name": None})

    assert res.status_code == 422
    assert profile.full_name == "Test User"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("full_name", "x" * 256),
        ("blood_type", "x" * 17),
        ("phone", "1" * 33),
        ("address", "x" * 513),
    ],
)
async def test_patch_me_rejects_profile_values_longer_than_db_columns(profile_patch_client, field, value):
    client, profile = profile_patch_client
    res = await client.patch("/v1/users/me", json={field: value})

    assert res.status_code == 422
    assert profile.full_name == "Test User"
    assert profile.phone == "+15551234567"
    assert profile.address == "123 Lane"
    assert profile.blood_type == "A+"


@pytest.mark.asyncio
async def test_patch_me_persists_insurance_medical_info(profile_patch_client):
    client, profile = profile_patch_client
    res = await client.patch(
        "/v1/users/me",
        json={
            "medical_info": {
                "allergies": None,
                "chronic_conditions": None,
                "current_medications": None,
                "notes": None,
                "insurance": {
                    "provider": "BHYT",
                    "policy_number": "HN-123456",
                    "group_number": None,
                },
            },
        },
    )

    assert res.status_code == 200
    body = res.json()["data"]
    assert body["medical_info"]["insurance"] == {
        "provider": "BHYT",
        "policy_number": "HN-123456",
        "group_number": None,
    }
    assert profile.medical_info["insurance"]["provider"] == "BHYT"


@pytest.mark.asyncio
async def test_patch_me_preserves_existing_insurance_on_partial_medical_info_patch(profile_patch_client):
    client, profile = profile_patch_client
    profile.medical_info = {
        "allergies": "Latex",
        "chronic_conditions": None,
        "current_medications": None,
        "notes": "Existing note",
        "insurance": {
            "provider": "BHYT",
            "policy_number": "HN-123456",
            "group_number": "G-1",
        },
    }

    res = await client.patch(
        "/v1/users/me",
        json={
            "medical_info": {
                "allergies": "Peanuts",
                "chronic_conditions": None,
                "current_medications": None,
                "notes": None,
            },
        },
    )

    assert res.status_code == 200
    body = res.json()["data"]
    assert body["medical_info"]["allergies"] == "Peanuts"
    assert body["medical_info"]["notes"] is None
    assert body["medical_info"]["insurance"] == {
        "provider": "BHYT",
        "policy_number": "HN-123456",
        "group_number": "G-1",
    }
    assert profile.medical_info["insurance"]["provider"] == "BHYT"
