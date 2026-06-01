"""Endpoint contract tests for `/v1/medications/**`.

We deliberately stop at the contract surface (auth, validation, error
shapes). Deeper "did the row land in PostgreSQL" assertions live with the
service-layer smoke harness — they need a real Postgres + the cascading
reminder/occurrence wiring.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app
from app.models.audit import AuditEventTypeEnum, AuditLog
# Force the SQLAlchemy mapper to wire up before any test instantiates a model.
from app.models import health_goal  # noqa: F401
from app.models.core import User


class _FakeRedis:
    """Minimal in-memory Redis stub — same shape as the devices test fixture
    plus `incr`/`expire`/`ttl` for the per-user rate limiter.
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
    await engine.dispose()


@pytest_asyncio.fixture
async def persisted_user():
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"med-endpoint-{uuid.uuid4().hex[:8]}@test.local",
        username=f"med_endpoint_{uuid.uuid4().hex[:8]}",
        display_name="Medication Endpoint",
        hashed_password="x",
    )
    async with AsyncSessionLocal() as db:
        db.add(user)
        await db.commit()

    try:
        yield type(
            "User",
            (),
            {"id": user_id, "email": user.email, "hashed_password": "x"},
        )()
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
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


@pytest.mark.asyncio
async def test_history_unauthenticated_returns_401(anonymous_client):
    res = await anonymous_client.get("/v1/medications/history")
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


@pytest.mark.asyncio
async def test_create_persists_plan_and_audit_event(persisted_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return persisted_user

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/v1/medications",
                json={
                    "name": "Lisinopril",
                    "dose_times": ["08:00"],
                    "repeat": "daily",
                    "start_date": "2026-05-30",
                    "tzid": "Asia/Ho_Chi_Minh",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 201
    body = res.json()
    assert body["data"]["name"] == "Lisinopril"
    assert body["data"]["dose_count"] == 1
    async with AsyncSessionLocal() as db:
        events = (
            await db.execute(
                select(AuditLog).where(AuditLog.user_id == persisted_user.id)
            )
        ).scalars().all()
    assert any(
        event.event_type == AuditEventTypeEnum.MEDICATION_PLAN_CREATED
        for event in events
    )


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
async def test_pause_accepts_empty_body(persisted_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return persisted_user

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            create_res = await client.post(
                "/v1/medications",
                json={"name": "Empty Pause", "dose_times": ["08:00"], "repeat": "daily"},
            )
            plan_id = create_res.json()["data"]["id"]
            pause_res = await client.post(f"/v1/medications/{plan_id}/pause")
    finally:
        app.dependency_overrides.clear()

    assert create_res.status_code == 201
    assert pause_res.status_code == 200
    data = pause_res.json()["data"]
    assert data["status"] == "paused"
    assert data["pause_until"] is None
    assert data["pause_reason"] is None


@pytest.mark.asyncio
async def test_pause_accepts_metadata_body(persisted_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return persisted_user

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            create_res = await client.post(
                "/v1/medications",
                json={"name": "Metadata Pause", "dose_times": ["08:00"], "repeat": "daily"},
            )
            plan_id = create_res.json()["data"]["id"]
            pause_res = await client.post(
                f"/v1/medications/{plan_id}/pause",
                json={
                    "pause_until": "2099-01-02T00:00:00+00:00",
                    "pause_reason": "  travel  ",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert create_res.status_code == 201
    assert pause_res.status_code == 200
    data = pause_res.json()["data"]
    assert data["status"] == "paused"
    assert data["pause_until"].startswith("2099-01-02T00:00:00")
    assert data["pause_reason"] == "travel"


@pytest.mark.asyncio
async def test_pause_rejects_past_pause_until(persisted_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return persisted_user

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            create_res = await client.post(
                "/v1/medications",
                json={"name": "Past Pause", "dose_times": ["08:00"], "repeat": "daily"},
            )
            plan_id = create_res.json()["data"]["id"]
            pause_res = await client.post(
                f"/v1/medications/{plan_id}/pause",
                json={"pause_until": "2000-01-01T00:00:00+00:00"},
            )
    finally:
        app.dependency_overrides.clear()

    assert create_res.status_code == 201
    assert pause_res.status_code == 400
    body = pause_res.json()
    detail = body.get("detail") or body.get("error") or {}
    assert detail.get("code") == "VALIDATION_ERROR"


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
async def test_history_returns_empty_envelope_when_no_plans(authed_client):
    res = await authed_client.get("/v1/medications/history")
    assert res.status_code == 200
    assert res.json()["data"] == []


@pytest.mark.asyncio
async def test_history_rejects_invalid_window(authed_client):
    res = await authed_client.get(
        "/v1/medications/history",
        params={
            "from": "2026-06-01T00:00:00+00:00",
            "to": "2026-05-31T00:00:00+00:00",
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_history_returns_plan_owned_dose_rows(persisted_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return persisted_user

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            create_res = await client.post(
                "/v1/medications",
                json={
                    "name": "Metformin",
                    "strength": "500 mg",
                    "dose_times": ["08:00"],
                    "repeat": "daily",
                    "start_date": "2026-05-30",
                    "tzid": "Asia/Ho_Chi_Minh",
                },
            )
            history_res = await client.get(
                "/v1/medications/history",
                params={
                    "from": "2026-05-29T00:00:00+00:00",
                    "to": "2026-06-02T00:00:00+00:00",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert create_res.status_code == 201
    plan_id = create_res.json()["data"]["id"]
    assert history_res.status_code == 200
    rows = history_res.json()["data"]
    assert rows
    row = rows[0]
    assert row["medication_plan_id"] == plan_id
    assert row["plan_name"] == "Metformin"
    assert row["strength"] == "500 mg"
    scheduled_at = datetime.datetime.fromisoformat(
        row["scheduled_at"].replace("Z", "+00:00")
    )
    assert datetime.datetime(2026, 5, 29, tzinfo=datetime.timezone.utc) <= scheduled_at
    assert scheduled_at < datetime.datetime(2026, 6, 2, tzinfo=datetime.timezone.utc)


@pytest.mark.asyncio
async def test_list_returns_empty_envelope_when_no_plans(authed_client):
    res = await authed_client.get("/v1/medications")
    assert res.status_code == 200
    body = res.json()
    assert body["data"] == []
