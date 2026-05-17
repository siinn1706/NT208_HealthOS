"""Contract checks for `/v1/appointments` detail/update endpoints."""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.main import app
# Force mapper init before any runtime model access in endpoint stack.
from app.models import health_goal  # noqa: F401


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

