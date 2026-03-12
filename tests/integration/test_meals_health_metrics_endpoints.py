"""Integration tests for Core BE meals and health-metrics endpoints.

These tests run against the FastAPI app via ASGI transport and override
auth/DB dependencies to validate endpoint behavior and response envelopes.
"""
from __future__ import annotations

import datetime
import sys
import types
import uuid
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

# Ensure backend package import works when running tests from repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.adapters.database import get_db
from app.api.v1.endpoints import health_metrics as health_metrics_ep
from app.api.v1.endpoints import meals as meals_ep
from app.core.security import get_current_user
from app.main import app


TEST_USER_ID = uuid.uuid4()


async def _override_current_user():
    return types.SimpleNamespace(
        id=TEST_USER_ID,
        email="tester@example.com",
        display_name="Tester",
        profile=None,
    )


async def _override_db():
    yield object()


@pytest.fixture(autouse=True)
def _override_dependencies():
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = _override_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_meals_returns_paginated_envelope(monkeypatch: pytest.MonkeyPatch):
    meal = types.SimpleNamespace(
        id=uuid.uuid4(),
        name="Bún bò",
        status="processing",
        nutrition_result=None,
        logged_at=datetime.datetime.now(datetime.timezone.utc),
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )

    async def fake_list_meals(**kwargs):
        return [meal], 1

    monkeypatch.setattr(meals_ep.meal_svc, "list_meals", fake_list_meals)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/meals?page=1&per_page=20")

    assert response.status_code == 200
    payload = response.json()
    assert "data" in payload and isinstance(payload["data"], list)
    assert "meta" in payload
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["per_page"] == 20
    assert payload["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_create_meal_returns_data_envelope(monkeypatch: pytest.MonkeyPatch):
    created_meal = types.SimpleNamespace(
        id=uuid.uuid4(),
        name="Phở bò",
        status="processing",
        nutrition_result=None,
        logged_at=datetime.datetime.now(datetime.timezone.utc),
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )

    async def fake_create_meal(**kwargs):
        return created_meal

    monkeypatch.setattr(meals_ep.meal_svc, "create_meal", fake_create_meal)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/v1/meals", json={"name": "Phở bò"})

    assert response.status_code == 201
    payload = response.json()
    assert "data" in payload
    assert payload["data"]["name"] == "Phở bò"
    assert payload["data"]["status"] == "processing"


@pytest.mark.asyncio
async def test_list_health_metrics_returns_paginated_envelope(monkeypatch: pytest.MonkeyPatch):
    metric = types.SimpleNamespace(
        id=uuid.uuid4(),
        user_id=TEST_USER_ID,
        metric_type="heart_rate",
        value=72.0,
        unit="bpm",
        recorded_at=datetime.datetime.now(datetime.timezone.utc),
        source="manual",
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )

    async def fake_list_health_metrics(**kwargs):
        return [metric], 1

    monkeypatch.setattr(health_metrics_ep.health_metric_svc, "list_health_metrics", fake_list_health_metrics)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/health-metrics?page=1&per_page=20")

    assert response.status_code == 200
    payload = response.json()
    assert "data" in payload and isinstance(payload["data"], list)
    assert "meta" in payload
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["per_page"] == 20
    assert payload["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_list_health_metrics_invalid_page_returns_error_detail():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/health-metrics?page=0&per_page=20")

    assert response.status_code == 400
    payload = response.json()
    assert "detail" in payload
    assert payload["detail"]["code"] == "VALIDATION_ERROR"
