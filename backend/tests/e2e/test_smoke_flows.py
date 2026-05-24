"""E2E smoke tests for critical HealthOS flows.

No real DB or external services required for the base suite.
All DB/Redis/storage dependencies are overridden via app.dependency_overrides.

External-service tests (image upload → MinIO, AI worker) are gated behind
the E2E_EXTERNAL env var and marked `e2e_external`.
"""
from __future__ import annotations

import os
import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_USER_ID = uuid.uuid4()


def _make_fake_user():
    """Minimal User-like object satisfying get_current_user consumers."""
    user = MagicMock()
    user.id = _FAKE_USER_ID
    user.email = "smoke@healthos.local"
    user.username = "smoke_user"
    user.display_name = "Smoke User"
    user.hashed_password = "x"
    user.onboarding_status = "completed"
    user.onboarding_completed_at = None
    user.created_at = None
    user.profile = None
    return user


def _make_execute_result(scalar_one_or_none=None, scalars_all=None, scalar_one=0):
    """Build a mock DB execute result with predictable return values."""
    scalars_result = MagicMock()
    scalars_result.first.return_value = scalar_one_or_none
    scalars_result.all.return_value = scalars_all if scalars_all is not None else []
    scalars_result.one_or_none.return_value = scalar_one_or_none

    result = MagicMock()
    result.scalars.return_value = scalars_result
    result.scalar_one_or_none.return_value = scalar_one_or_none
    result.scalar_one.return_value = scalar_one
    result.scalar.return_value = scalar_one_or_none
    return result


def _make_fake_db():
    """Async DB session stub — all queries return empty/None by default."""
    session = AsyncMock()
    # Default: no rows found (scalar_one_or_none → None, scalar_one → 0)
    session.execute = AsyncMock(side_effect=lambda *a, **kw: _make_execute_result())
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    return session


def _make_fake_redis():
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock(return_value=True)
    return redis


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def anon_client() -> AsyncGenerator[AsyncClient, None]:
    """Unauthenticated ASGI test client — no overrides."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def auth_client() -> AsyncGenerator[AsyncClient, None]:
    """Authenticated ASGI test client with DB/Redis/auth overridden."""
    fake_user = _make_fake_user()
    fake_db = _make_fake_db()
    fake_redis = _make_fake_redis()

    async def _override_user():
        return fake_user

    async def _override_db():
        yield fake_db

    async def _override_redis():
        return fake_redis

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = _override_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. Auth guard — every protected route returns 401 without token
# ---------------------------------------------------------------------------

PROTECTED_ROUTES = [
    ("GET", "/v1/users/me"),
    ("GET", "/v1/meals"),
    ("POST", "/v1/meals"),
    ("GET", "/v1/reminders"),
    ("POST", "/v1/reminders"),
    ("GET", "/v1/appointments"),
    ("POST", "/v1/appointments"),
    ("GET", "/v1/notifications"),
    ("POST", "/v1/notifications/read-all"),
    ("GET", "/v1/reports"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
async def test_protected_route_returns_401_without_token(
    anon_client: AsyncClient, method: str, path: str
):
    res = await anon_client.request(method, path)
    assert res.status_code == 401, f"{method} {path} → expected 401, got {res.status_code}"


# ---------------------------------------------------------------------------
# 2. Profile fetch — GET /v1/users/me returns 200 with overridden auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_profile_fetch_returns_200(auth_client: AsyncClient):
    res = await auth_client.get("/v1/users/me")
    # The endpoint calls selectinload on the real User ORM object; with our
    # mock user (profile=None) it will serialize using the fallback path.
    # 200 means auth + routing both work.
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# 3. Meals — create requires auth, unknown ID returns 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_meal_requires_auth(anon_client: AsyncClient):
    res = await anon_client.post("/v1/meals", json={"name": "Test meal"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_meal_detail_unknown_id_returns_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/v1/meals/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_meal_patch_unknown_id_returns_404(auth_client: AsyncClient):
    res = await auth_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": "Updated"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_meal_patch_empty_name_returns_422(auth_client: AsyncClient):
    res = await auth_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_meal_ingredients_unknown_id_returns_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/v1/meals/{uuid.uuid4()}/ingredients")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# 4. Reminders — auth guard + validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_reminder_requires_auth(anon_client: AsyncClient):
    res = await anon_client.post("/v1/reminders", json={
        "type": "medicine", "title": "Pill", "time": "08:00", "repeat": "daily"
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_create_reminder_invalid_type_returns_422(auth_client: AsyncClient):
    res = await auth_client.post("/v1/reminders", json={
        "type": "invalid_type", "title": "Pill", "time": "08:00", "repeat": "daily"
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_reminder_invalid_time_format_returns_422(auth_client: AsyncClient):
    res = await auth_client.post("/v1/reminders", json={
        "type": "medicine", "title": "Pill", "time": "8:00am", "repeat": "daily"
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_mark_reminder_done_requires_auth(anon_client: AsyncClient):
    res = await anon_client.patch(f"/v1/reminders/{uuid.uuid4()}", json={"done": True})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 5. Appointments — auth guard + validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_appointment_requires_auth(anon_client: AsyncClient):
    res = await anon_client.post("/v1/appointments", json={
        "appointment_date": "2026-06-01T09:00:00Z",
        "doctor_name": "Dr. Test",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_create_appointment_missing_doctor_name_returns_422(auth_client: AsyncClient):
    res = await auth_client.post("/v1/appointments", json={
        "appointment_date": "2026-06-01T09:00:00Z",
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_appointment_empty_doctor_name_returns_422(auth_client: AsyncClient):
    res = await auth_client.post("/v1/appointments", json={
        "appointment_date": "2026-06-01T09:00:00Z",
        "doctor_name": "",
    })
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# 6. Notifications — auth guard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_notifications_requires_auth(anon_client: AsyncClient):
    res = await anon_client.get("/v1/notifications")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_mark_notification_read_requires_auth(anon_client: AsyncClient):
    res = await anon_client.post(f"/v1/notifications/{uuid.uuid4()}/read")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_mark_all_notifications_read_requires_auth(anon_client: AsyncClient):
    res = await anon_client.post("/v1/notifications/read-all")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 7. Reports — auth guard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reports_requires_auth(anon_client: AsyncClient):
    res = await anon_client.get("/v1/reports")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 8. Input validation — auth schema edge cases
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def auth_schema_client() -> AsyncGenerator[AsyncClient, None]:
    """Client with only Redis + rate-limit overridden — used for schema-validation
    tests on auth endpoints that need no real DB but hit rate-limit middleware."""
    from app.core.rate_limit import rate_limit_login, rate_limit_otp_request

    async def _noop_rate_limit() -> None:
        return None

    fake_redis = _make_fake_redis()

    async def _override_redis():
        return fake_redis

    app.dependency_overrides[get_redis] = _override_redis
    app.dependency_overrides[rate_limit_login] = _noop_rate_limit
    app.dependency_overrides[rate_limit_otp_request] = _noop_rate_limit

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_login_empty_identifier_returns_422(auth_schema_client: AsyncClient):
    res = await auth_schema_client.post("/v1/auth/login", json={"identifier": "", "password": "pass"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login_empty_password_returns_422(auth_schema_client: AsyncClient):
    res = await auth_schema_client.post("/v1/auth/login", json={"identifier": "user@example.com", "password": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_refresh_empty_token_returns_422(anon_client: AsyncClient):
    res = await anon_client.post("/v1/auth/refresh", json={"refresh_token": ""})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# 9. External-service tests — gated behind E2E_EXTERNAL=1
#    These tests require MinIO, Redis, Celery worker, and a real DB.
# ---------------------------------------------------------------------------

_E2E_EXTERNAL = bool(os.getenv("E2E_EXTERNAL"))


@pytest.mark.e2e_external
@pytest.mark.asyncio
@pytest.mark.skipif(not _E2E_EXTERNAL, reason="Set E2E_EXTERNAL=1 to run external-service E2E tests")
async def test_external_meal_image_upload_and_poll():
    """Full image-upload → analysis-job poll flow.

    Requires: MinIO (STORAGE_*), Celery worker with AI task queue running.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # This test assumes a real auth token is supplied via E2E_ACCESS_TOKEN env var.
        token = os.environ["E2E_ACCESS_TOKEN"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create meal
        create_res = await client.post(
            "/v1/meals",
            json={"name": "External smoke meal"},
            headers=headers,
        )
        assert create_res.status_code == 201
        meal_id = create_res.json()["data"]["id"]

        # Upload image (tiny valid JPEG header)
        jpeg_1px = (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
            b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
            b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
            b"\xff\xd9"
        )
        img_res = await client.post(
            f"/v1/meals/{meal_id}/image",
            headers=headers,
            files={"file": ("test.jpg", jpeg_1px, "image/jpeg")},
        )
        assert img_res.status_code in (200, 202)

        # Poll status — just check it responds
        poll_res = await client.get(f"/v1/meals/{meal_id}", headers=headers)
        assert poll_res.status_code == 200
        assert poll_res.json()["data"]["id"] == meal_id


@pytest.mark.e2e_external
@pytest.mark.asyncio
@pytest.mark.skipif(not _E2E_EXTERNAL, reason="Set E2E_EXTERNAL=1 to run external-service E2E tests")
async def test_external_full_auth_and_profile_flow():
    """Full register → login → profile-update flow against real DB + Redis.

    Requires: Postgres DB, Redis, real SMTP or dev OTP echo enabled.
    """
    import time
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"e2e-smoke-{int(time.time())}@healthos.local"

        otp_res = await client.post("/v1/auth/otp/request", json={
            "email": unique_email,
            "purpose": "signup",
            "password": "SmokeExternal@9999",
        })
        assert otp_res.status_code == 200
        otp_code = otp_res.json().get("data", {}).get("otp")  # only returned in dev mode
        if not otp_code:
            pytest.skip("OTP echo not available in this environment")

        verify_res = await client.post("/v1/auth/otp/verify", json={
            "email": unique_email,
            "purpose": "signup",
            "code": otp_code,
        })
        assert verify_res.status_code == 200
        token = verify_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_res = await client.get("/v1/users/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["data"]["email"] == unique_email

        patch_res = await client.patch("/v1/users/me", json={"full_name": "E2E Smoke"}, headers=headers)
        assert patch_res.status_code == 200
