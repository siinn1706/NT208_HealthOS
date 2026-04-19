"""Contract tests for the Pre-Visit Brief endpoints (P3).

Focuses on the BFF-facing surface: auth, schema validation, and route
registration. Deeper service-layer behavior is covered by the safety
regression suite (`test_triage_engine.py`) — those tests exercise the
engine that this layer wraps.

Notes on style:
  * Mirrors `test_devices_ingest.py`: in-memory ASGI client, no real DB
    in the path, dependency overrides for `get_current_user`.
  * The auth-required tests use the un-overridden client so the real
    `get_current_user` dependency rejects with 401.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app


class _FakeRedis:
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
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur


@pytest_asyncio.fixture
async def anon_client():
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_redis, None)


@pytest_asyncio.fixture
async def authed_client():
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "test@example.com", "hashed_password": "fake"},
    )()
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return fake_user

    app.dependency_overrides[get_current_user] = override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_redis, None)
    app.dependency_overrides.pop(get_current_user, None)


# ─── Route registration ──────────────────────────────────────────────────────


def test_all_thirteen_endpoints_are_registered():
    """Plan §10.2 promises ~13 endpoints. This pins the count so any drop
    surfaces as a test failure rather than a silent regression.
    """
    paths = sorted(
        {r.path for r in app.routes if getattr(r, "path", "").startswith("/v1/visit-briefs")}
    )
    expected = {
        "/v1/visit-briefs",
        "/v1/visit-briefs/{brief_id}",
        "/v1/visit-briefs/{brief_id}/symptoms",
        "/v1/visit-briefs/{brief_id}/symptoms/{symptom_id}",
        "/v1/visit-briefs/{brief_id}/route-now",
        "/v1/visit-briefs/{brief_id}/triage-history",
        "/v1/visit-briefs/{brief_id}/questions",
        "/v1/visit-briefs/{brief_id}/questions/suggested",
        "/v1/visit-briefs/{brief_id}/finalize",
        "/v1/visit-briefs/{brief_id}/attach",
        "/v1/visit-briefs/{brief_id}/attach/{link_id}",
    }
    assert expected.issubset(set(paths)), (
        f"Missing routes: {expected - set(paths)}"
    )


# ─── Auth required (401) ─────────────────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method, path",
    [
        ("GET", "/v1/visit-briefs"),
        ("POST", "/v1/visit-briefs"),
        ("GET", f"/v1/visit-briefs/{uuid.uuid4()}"),
        ("PATCH", f"/v1/visit-briefs/{uuid.uuid4()}"),
        ("DELETE", f"/v1/visit-briefs/{uuid.uuid4()}"),
        ("POST", f"/v1/visit-briefs/{uuid.uuid4()}/symptoms"),
        ("PATCH", f"/v1/visit-briefs/{uuid.uuid4()}/symptoms/{uuid.uuid4()}"),
        ("DELETE", f"/v1/visit-briefs/{uuid.uuid4()}/symptoms/{uuid.uuid4()}"),
        ("POST", f"/v1/visit-briefs/{uuid.uuid4()}/route-now"),
        ("GET", f"/v1/visit-briefs/{uuid.uuid4()}/triage-history"),
        ("GET", f"/v1/visit-briefs/{uuid.uuid4()}/questions/suggested"),
        ("PATCH", f"/v1/visit-briefs/{uuid.uuid4()}/questions"),
        ("POST", f"/v1/visit-briefs/{uuid.uuid4()}/finalize"),
        ("POST", f"/v1/visit-briefs/{uuid.uuid4()}/attach"),
        ("DELETE", f"/v1/visit-briefs/{uuid.uuid4()}/attach/{uuid.uuid4()}"),
    ],
)
async def test_endpoint_requires_auth(anon_client: AsyncClient, method: str, path: str):
    """Every endpoint must reject anonymous requests with 401."""
    body = {} if method in ("POST", "PATCH") else None
    response = await anon_client.request(method, path, json=body)
    assert response.status_code == 401, (
        f"{method} {path} returned {response.status_code} for unauthenticated "
        f"request — expected 401."
    )


# ─── Validation errors (422) ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_brief_rejects_invalid_visit_type(authed_client: AsyncClient):
    """Visit type Literal must reject unknown values with 422."""
    response = await authed_client.post(
        "/v1/visit-briefs",
        json={"visit_type": "shaman_visit"},
    )
    assert response.status_code == 422
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_create_brief_rejects_overlong_title(authed_client: AsyncClient):
    response = await authed_client.post(
        "/v1/visit-briefs",
        json={"visit_type": "gp_routine", "title": "x" * 1000},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_symptom_rejects_severity_out_of_range(authed_client: AsyncClient):
    response = await authed_client.post(
        f"/v1/visit-briefs/{uuid.uuid4()}/symptoms",
        json={
            "concern_text": "headache",
            "concern_category": "pain",
            "severity_0_10": 11,
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_symptom_rejects_empty_concern_text(authed_client: AsyncClient):
    response = await authed_client.post(
        f"/v1/visit-briefs/{uuid.uuid4()}/symptoms",
        json={
            "concern_text": "",
            "concern_category": "pain",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_symptom_rejects_unknown_category(authed_client: AsyncClient):
    response = await authed_client.post(
        f"/v1/visit-briefs/{uuid.uuid4()}/symptoms",
        json={
            "concern_text": "back pain",
            "concern_category": "spiritual",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_replace_questions_rejects_more_than_ten(authed_client: AsyncClient):
    """Body validation cap: max 10 questions per set."""
    questions = [
        {
            "id": f"custom-{i}",
            "source": "custom",
            "text_vi": f"Câu {i}?",
            "text_en": f"Question {i}?",
            "order": i,
            "locked": False,
        }
        for i in range(11)
    ]
    response = await authed_client.patch(
        f"/v1/visit-briefs/{uuid.uuid4()}/questions",
        json={"questions": questions},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_attach_requires_appointment_id(authed_client: AsyncClient):
    response = await authed_client.post(
        f"/v1/visit-briefs/{uuid.uuid4()}/attach",
        json={},
    )
    assert response.status_code == 422
