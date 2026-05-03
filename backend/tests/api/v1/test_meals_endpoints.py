"""Contract checks for `/v1/meals` detail/update/ingredients endpoints."""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.security import get_current_user
from app.main import app


@pytest_asyncio.fixture
async def anonymous_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def authed_client():
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "meals@local", "hashed_password": "x"},
    )()

    async def override_user():
        return fake_user

    app.dependency_overrides[get_current_user] = override_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    from app.adapters.database import engine
    await engine.dispose()


@pytest.mark.asyncio
async def test_meal_detail_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.get(f"/v1/meals/{uuid.uuid4()}")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_meal_patch_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": "Updated"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_meal_ingredients_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.get(f"/v1/meals/{uuid.uuid4()}/ingredients")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_unknown_meal_returns_404(authed_client: AsyncClient):
    meal_id = uuid.uuid4()
    res_detail = await authed_client.get(f"/v1/meals/{meal_id}")
    assert res_detail.status_code == 404
    res_patch = await authed_client.patch(f"/v1/meals/{meal_id}", json={"name": "Updated"})
    assert res_patch.status_code == 404
    res_ing = await authed_client.get(f"/v1/meals/{meal_id}/ingredients")
    assert res_ing.status_code == 404


@pytest.mark.asyncio
async def test_patch_rejects_empty_name(authed_client: AsyncClient):
    res = await authed_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": ""})
    assert res.status_code == 422
