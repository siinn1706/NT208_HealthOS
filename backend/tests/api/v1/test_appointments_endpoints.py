"""Contract checks for `/v1/appointments` detail/update endpoints."""
from __future__ import annotations

import uuid
import datetime
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.adapters.database import AsyncSessionLocal, engine
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.core.security import get_current_user
from app.main import app
from app.models.core import Appointment, AppointmentStatusEnum, User
# Force mapper init before any runtime model access in endpoint stack.
from app.models import health_goal  # noqa: F401


requires_database = pytest.mark.skipif(
    not settings.database_url,
    reason="needs real Postgres",
)


class _FakeRedis:
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


@pytest_asyncio.fixture
async def anonymous_client():
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
        {"id": uuid.uuid4(), "email": "appt@local", "hashed_password": "x"},
    )()
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return fake_user

    app.dependency_overrides[get_current_user] = override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    from app.adapters.database import engine
    await engine.dispose()


@pytest_asyncio.fixture
async def prep_http_state():
    user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        owner = User(
            email=f"prep-http-owner-{uuid.uuid4().hex[:8]}@test.local",
            username=f"prep_http_owner_{uuid.uuid4().hex[:8]}",
            display_name="Prep HTTP Owner",
            hashed_password="x",
        )
        other = User(
            email=f"prep-http-other-{uuid.uuid4().hex[:8]}@test.local",
            username=f"prep_http_other_{uuid.uuid4().hex[:8]}",
            display_name="Prep HTTP Other",
            hashed_password="x",
        )
        db.add_all([owner, other])
        await db.flush()
        appointment = Appointment(
            user_id=owner.id,
            appointment_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3),
            doctor_name="Dr HTTP Prep",
            status=AppointmentStatusEnum.UPCOMING,
        )
        db.add(appointment)
        await db.commit()
        user_ids.extend([owner.id, other.id])
        yield owner.id, other.id, appointment.id

    async with AsyncSessionLocal() as cleanup:
        await cleanup.execute(delete(User).where(User.id.in_(user_ids)))
        await cleanup.commit()
    await engine.dispose()


async def _request_as_user(
    user_id: uuid.UUID,
    method: str,
    path: str,
    *,
    json: dict | None = None,
):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return SimpleNamespace(id=user_id, email=f"{user_id}@test.local", hashed_password="x")

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, json=json)
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


@pytest.mark.asyncio
async def test_get_detail_unauthenticated_returns_401(anonymous_client: AsyncClient):
    response = await anonymous_client.get(f"/v1/appointments/{uuid.uuid4()}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_patch_detail_unauthenticated_returns_401(anonymous_client: AsyncClient):
    response = await anonymous_client.patch(
        f"/v1/appointments/{uuid.uuid4()}",
        json={"notes": "test"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_unknown_appointment_returns_404(authed_client: AsyncClient):
    response = await authed_client.get(f"/v1/appointments/{uuid.uuid4()}")
    assert response.status_code == 404
    body = response.json()
    detail = body.get("detail") or body
    assert "NOT_FOUND" in str(detail)


@pytest.mark.asyncio
async def test_patch_unknown_appointment_returns_404(authed_client: AsyncClient):
    response = await authed_client.patch(
        f"/v1/appointments/{uuid.uuid4()}",
        json={"notes": "updated notes"},
    )
    assert response.status_code == 404
    body = response.json()
    detail = body.get("detail") or body
    assert "NOT_FOUND" in str(detail)


@pytest.mark.asyncio
async def test_patch_rejects_empty_doctor_name(authed_client: AsyncClient):
    response = await authed_client.patch(
        f"/v1/appointments/{uuid.uuid4()}",
        json={"doctor_name": ""},
    )
    assert response.status_code == 422


@requires_database
@pytest.mark.asyncio
async def test_create_video_appointment_persists_join_url(prep_http_state):
    owner_id, _other_id, _appointment_id = prep_http_state
    future = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)

    created = await _request_as_user(
        owner_id,
        "POST",
        "/v1/appointments",
        json={
            "appointment_date": future.isoformat(),
            "doctor_name": "Dr Video",
            "specialty": "Telehealth",
            "visit_type": "video",
            "video_join_url": "https://meet.example/room-123",
        },
    )

    assert created.status_code == 201
    data = created.json()["data"]
    assert data["visit_type"] == "video"
    assert data["video_join_url"] == "https://meet.example/room-123"

    detail = await _request_as_user(owner_id, "GET", f"/v1/appointments/{data['id']}")

    assert detail.status_code == 200
    assert detail.json()["data"]["video_join_url"] == "https://meet.example/room-123"


@requires_database
@pytest.mark.asyncio
async def test_create_rejects_video_join_url_for_in_person(prep_http_state):
    owner_id, _other_id, _appointment_id = prep_http_state
    future = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)

    response = await _request_as_user(
        owner_id,
        "POST",
        "/v1/appointments",
        json={
            "appointment_date": future.isoformat(),
            "doctor_name": "Dr In Person",
            "visit_type": "in_person",
            "video_join_url": "https://meet.example/not-allowed",
        },
    )

    assert response.status_code == 400
    assert "video_join_url is only allowed" in str(response.json())


@pytest.mark.asyncio
async def test_create_rejects_invalid_video_join_url(authed_client: AsyncClient):
    future = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)

    response = await authed_client.post(
        "/v1/appointments",
        json={
            "appointment_date": future.isoformat(),
            "doctor_name": "Dr Invalid Link",
            "visit_type": "video",
            "video_join_url": "not-a-url",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_prep_unauthenticated_returns_401(anonymous_client: AsyncClient):
    response = await anonymous_client.get(f"/v1/appointments/{uuid.uuid4()}/prep")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_patch_prep_unauthenticated_returns_401(anonymous_client: AsyncClient):
    response = await anonymous_client.patch(
        f"/v1/appointments/{uuid.uuid4()}/prep",
        json={"checklist_items": []},
    )
    assert response.status_code == 401


@requires_database
@pytest.mark.asyncio
async def test_patch_prep_persists_and_get_prep_reloads(prep_http_state):
    owner_id, _other_id, appointment_id = prep_http_state
    path = f"/v1/appointments/{appointment_id}/prep"

    saved = await _request_as_user(
        owner_id,
        "PATCH",
        path,
        json={
            "checklist_items": [
                {"id": "insurance-card", "label": "Bring insurance card", "checked": True},
                {"id": "medication-list", "label": "List current medications", "checked": False},
            ],
        },
    )

    assert saved.status_code == 200
    saved_data = saved.json()["data"]
    assert saved_data["appointment_id"] == str(appointment_id)
    assert saved_data["checklist_items"][0]["checked"] is True

    reloaded = await _request_as_user(owner_id, "GET", path)

    assert reloaded.status_code == 200
    assert [item["checked"] for item in reloaded.json()["data"]["checklist_items"]] == [True, False]


@requires_database
@pytest.mark.asyncio
async def test_prep_endpoints_are_owner_scoped(prep_http_state):
    _owner_id, other_id, appointment_id = prep_http_state
    path = f"/v1/appointments/{appointment_id}/prep"

    get_response = await _request_as_user(other_id, "GET", path)
    patch_response = await _request_as_user(
        other_id,
        "PATCH",
        path,
        json={"checklist_items": []},
    )

    assert get_response.status_code == 404
    assert patch_response.status_code == 404

