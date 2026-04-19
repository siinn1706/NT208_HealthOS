"""Endpoint contract tests for `/v1/medications/**`.

We deliberately stop at the contract surface (auth, validation, error
shapes). Deeper "did the row land in PostgreSQL" assertions live with the
service-layer smoke harness — they need a real Postgres + the cascading
reminder/occurrence wiring.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app
# Force the SQLAlchemy mapper to wire up before any test instantiates a model.
from app.models import health_goal  # noqa: F401


class _FakeRedis:
    """Minimal in-memory Redis stub — same shape as the devices test fixture
    plus `incr`/`expire`/`ttl` for the new per-user rate limiter (review M16).
    """

    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def set(self, key: str, value, *, nx: bool = False, ex: int | None = None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def delete(self, key: str) -> int:
        return 1 if self.values.pop(key, None) is not None else 0

    async def eval(self, _script: str, _numkeys: int, key: str, *_args):
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur

    async def incr(self, key: str) -> int:
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur

    async def expire(self, _key: str, _seconds: int) -> bool:
        return True

    async def ttl(self, _key: str) -> int:
        return -1


@pytest.fixture
def fake_user():
    return type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "med@local", "hashed_password": "x"},
    )()


@pytest_asyncio.fixture
async def anonymous_client():
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_redis, None)


@pytest_asyncio.fixture
async def authed_client(fake_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return fake_user

    app.dependency_overrides[get_current_user] = override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    # asyncpg + pytest-asyncio + ASGITransport on Windows leaks pooled
    # connections across tests when the same engine is reused. Dispose
    # explicitly so the next test gets a fresh pool.
    from app.adapters.database import engine
    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# Auth + listing
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_unauthenticated_returns_401(anonymous_client):
    res = await anonymous_client.get("/v1/medications")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_today_unauthenticated_returns_401(anonymous_client):
    res = await anonymous_client.get("/v1/medications/today")
    assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_rejects_empty_dose_times(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={"name": "Lisinopril", "dose_times": [], "repeat": "daily"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rejects_bad_time_format(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={"name": "Lisinopril", "dose_times": ["8:00"], "repeat": "daily"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rejects_too_many_dose_times(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={
            "name": "X",
            "dose_times": [
                "00:00", "01:00", "02:00", "03:00",
                "04:00", "05:00", "06:00", "07:00", "08:00",
            ],
            "repeat": "daily",
        },
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rejects_unknown_form(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={
            "name": "X",
            "dose_times": ["08:00"],
            "form": "syrup",
            "repeat": "daily",
        },
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rejects_unknown_repeat(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={"name": "X", "dose_times": ["08:00"], "repeat": "hourly"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rejects_end_before_start(authed_client):
    res = await authed_client.post(
        "/v1/medications",
        json={
            "name": "X",
            "dose_times": ["08:00"],
            "repeat": "daily",
            "start_date": "2026-04-10",
            "end_date": "2026-04-05",
        },
    )
    assert res.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Cross-user isolation
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_unknown_plan_returns_404(authed_client):
    res = await authed_client.get(f"/v1/medications/{uuid.uuid4()}")
    assert res.status_code == 404
    body = res.json()
    detail = body.get("detail") or body
    assert "NOT_FOUND" in str(detail)


@pytest.mark.asyncio
async def test_pause_unknown_plan_returns_404(authed_client):
    res = await authed_client.post(f"/v1/medications/{uuid.uuid4()}/pause")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_resume_unknown_plan_returns_404(authed_client):
    res = await authed_client.post(f"/v1/medications/{uuid.uuid4()}/resume")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_archive_unknown_plan_returns_404(authed_client):
    res = await authed_client.delete(f"/v1/medications/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_adherence_unknown_plan_returns_404(authed_client):
    res = await authed_client.get(
        f"/v1/medications/{uuid.uuid4()}/adherence?period=7d"
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_adherence_rejects_unknown_period(authed_client):
    res = await authed_client.get(
        f"/v1/medications/{uuid.uuid4()}/adherence?period=10d"
    )
    # Path-level pattern match returns 422 before the service is even called.
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_refill_unknown_plan_returns_404(authed_client):
    res = await authed_client.post(
        f"/v1/medications/{uuid.uuid4()}/refill",
        json={"supply_units": 30},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_refill_rejects_negative_supply(authed_client):
    res = await authed_client.post(
        f"/v1/medications/{uuid.uuid4()}/refill",
        json={"supply_units": -1},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_import_unknown_appointment_returns_404(authed_client):
    res = await authed_client.post(
        f"/v1/medications/import/{uuid.uuid4()}",
        json={},
    )
    assert res.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Today panel — happy path with no plans returns empty data envelope
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_today_returns_empty_envelope_when_no_plans(authed_client):
    res = await authed_client.get("/v1/medications/today")
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []


@pytest.mark.asyncio
async def test_list_returns_empty_envelope_when_no_plans(authed_client):
    res = await authed_client.get("/v1/medications")
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []
