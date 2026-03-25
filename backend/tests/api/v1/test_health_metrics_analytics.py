"""BFF route tests for health metrics analytics endpoints.

Tests the FastAPI app directly using httpx.AsyncClient.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
import uuid

from app.main import app
from app.core.security import get_current_user
from app.models.core import User


@pytest.fixture
def authenticated_user():
    user = type("User", (), {
        "id": uuid.uuid4(),
        "email": "test@example.com",
        "hashed_password": "fake",
    })()
    return user


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def authenticated_client(authenticated_user):
    """AsyncClient with auth dependency overridden."""
    async def override_get_current_user():
        return authenticated_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


# ── GET /health-metrics/aggregated Tests ─────────────────────────────────────

@pytest.mark.asyncio
async def test_aggregated_requires_auth(async_client):
    """Unauthenticated request returns 401."""
    res = await async_client.get("/v1/health-metrics/aggregated?metric_type=heart_rate&period=daily")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_aggregated_missing_metric_type(authenticated_client):
    """Missing metric_type returns 422."""
    res = await authenticated_client.get("/v1/health-metrics/aggregated?period=daily")
    assert res.status_code == 422


# ── GET /goals/progress Tests ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_goals_progress_requires_auth(async_client):
    res = await async_client.get("/v1/goals/progress?metric=steps&target=10000&period=30d")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_goals_progress_negative_target(authenticated_client):
    """Negative target returns 422 validation error (Query gt=0)."""
    res = await authenticated_client.get("/v1/goals/progress?metric=steps&target=-100&period=30d")
    assert res.status_code == 422
