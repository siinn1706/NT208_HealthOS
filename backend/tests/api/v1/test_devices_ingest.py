"""Endpoint tests for `POST /v1/devices/{id}/ingest`.

The deeper "did the row land in PostgreSQL" assertions live at the
integration test layer (they need a real pg + ON CONFLICT semantics).
Here we cover the contract surface:

  * 401 when unauthenticated.
  * 400 when Idempotency-Key is missing.
  * 413 when the request body exceeds the 256 KiB cap.

We override `get_redis` with the same in-memory fake the idempotency
unit tests use so the rate-limit dependency doesn't trip the
fail-closed branch and surface 503s for what should be 4xxs.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import engine
from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app


class _FakeRedis:
    """In-memory Redis stub that satisfies SET/GET/DEL/EVAL well enough for
    the rate limiter (eval) + idempotency store (set/get/delete)."""

    def __init__(self):
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
        # The Lua used by `ip_rate_limiter` is just INCR with TTL. For the
        # 6-req/min limit we just need a monotonically-increasing counter
        # per key; TTL doesn't matter for a single test pass.
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur


@pytest.fixture
def authenticated_user():
    return type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "test@example.com", "hashed_password": "fake"},
    )()


@pytest_asyncio.fixture
async def async_client():
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_redis, None)
    # pytest-asyncio creates a new event loop per test; asyncpg
    # connections in the global engine pool are bound to the OLD loop
    # and break when the next test tries to reuse them on Windows
    # (`NoneType has no attribute 'send'`). Dispose the engine here so
    # the next test gets fresh connections.
    await engine.dispose()


@pytest_asyncio.fixture
async def authenticated_client(authenticated_user):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return authenticated_user

    app.dependency_overrides[get_current_user] = override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_ingest_requires_auth(async_client):
    """Unauthenticated callers get 401 before any rate-limit / Redis cost."""
    res = await async_client.post(
        f"/v1/devices/{uuid.uuid4()}/ingest",
        json={"records": []},
        headers={"Idempotency-Key": "abc"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_ingest_requires_idempotency_key(authenticated_client):
    """The contract is explicit — without an Idempotency-Key we cannot
    safely deduplicate retries, so refuse the request up front."""
    res = await authenticated_client.post(
        f"/v1/devices/{uuid.uuid4()}/ingest",
        json={"records": []},
    )
    assert res.status_code == 400
    body = res.json()
    detail = body.get("detail") or body
    assert "IDEMPOTENCY_KEY_REQUIRED" in str(detail)


@pytest.mark.asyncio
async def test_ingest_rejects_oversized_body(authenticated_client):
    """The 256 KiB cap protects against accidentally syncing years of
    sub-second HR samples in one go. We rely on Content-Length first
    so the upload never reaches the parser."""
    payload = {
        "records": [],
        "next_changes_tokens": {"Steps": "x" * 300_000},
    }
    res = await authenticated_client.post(
        f"/v1/devices/{uuid.uuid4()}/ingest",
        json=payload,
        headers={"Idempotency-Key": "test-oversized"},
    )
    assert res.status_code == 413


@pytest.mark.asyncio
async def test_ingest_rate_limit_kicks_in_at_seven_calls(authenticated_client):
    """6 req/min/IP — the 7th call inside the same window must 429.
    The fake Redis keeps a monotonically-increasing counter per key, so
    the test is deterministic regardless of wall clock."""
    headers = {"Idempotency-Key": "rate-test"}
    body = {"records": [], "next_changes_tokens": {}}
    # First 6 succeed up to the device-not-found stage (404). The 7th
    # is rejected by the rate limiter before reaching the device load.
    statuses = []
    for i in range(7):
        res = await authenticated_client.post(
            f"/v1/devices/{uuid.uuid4()}/ingest",
            json=body,
            headers={**headers, "Idempotency-Key": f"rate-test-{i}"},
        )
        statuses.append(res.status_code)
    # Last call must be 429; earlier calls bounce on auth/404/etc but
    # never on 429 because they're under the limit.
    assert statuses[-1] == 429
    assert all(s != 429 for s in statuses[:-1])


@pytest.mark.asyncio
async def test_ingest_validation_failure_returns_422(authenticated_client):
    """A medical-range violation (heart_rate=999) must be rejected as
    422, not silently swallowed."""
    bad_record = {
        "external_id": "bad-hr",
        "metric_type": "heart_rate",
        "value": 999,
        "unit": "bpm",
        "recorded_at": "2026-04-19T12:00:00Z",
        "source": "health_connect",
    }
    res = await authenticated_client.post(
        f"/v1/devices/{uuid.uuid4()}/ingest",
        json={"records": [bad_record]},
        headers={"Idempotency-Key": "validation-test"},
    )
    # 422 surfaces as a JSON detail with VALIDATION_FAILED code.
    assert res.status_code == 422
    body = res.json()
    detail = body.get("detail") or body
    assert "VALIDATION_FAILED" in str(detail)


@pytest.mark.asyncio
async def test_ingest_unknown_device_returns_404(authenticated_client):
    """Path id that doesn't belong to any of the user's devices → 404
    with the canonical NOT_FOUND code (not a 500 from a missing row
    deeper in the service)."""
    res = await authenticated_client.post(
        f"/v1/devices/{uuid.uuid4()}/ingest",
        json={"records": [], "next_changes_tokens": {}},
        headers={"Idempotency-Key": "unknown-device-test"},
    )
    assert res.status_code == 404
    body = res.json()
    detail = body.get("detail") or body
    assert "NOT_FOUND" in str(detail)


# ── PATCH /devices/{id}/permissions contract surface ────────────────────


@pytest.mark.asyncio
async def test_permissions_patch_requires_auth(async_client):
    res = await async_client.patch(
        f"/v1/devices/{uuid.uuid4()}/permissions",
        json={"scopes": ["Steps"]},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_permissions_patch_rejects_unknown_scope(authenticated_client):
    """Closed vocabulary (M6 fix) — only known HC record-type strings
    are allowed in `scopes`."""
    res = await authenticated_client.patch(
        f"/v1/devices/{uuid.uuid4()}/permissions",
        json={"scopes": ["NotARealHCType"]},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_permissions_patch_rejects_too_many_scopes(authenticated_client):
    """`max_length=20` on the scopes list."""
    res = await authenticated_client.patch(
        f"/v1/devices/{uuid.uuid4()}/permissions",
        json={"scopes": ["Steps"] * 21},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_permissions_patch_unknown_device_returns_404(authenticated_client):
    res = await authenticated_client.patch(
        f"/v1/devices/{uuid.uuid4()}/permissions",
        json={"scopes": ["Steps"]},
    )
    assert res.status_code == 404
