from __future__ import annotations

import uuid
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.api.v1.endpoints import dashboard as dashboard_ep
from app.core.security import get_current_user
from app.main import app


@pytest_asyncio.fixture
async def dashboard_client():
    profile = type("Profile", (), {})()
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "dashboard@local", "profile": profile},
    )()
    fake_db = object()

    async def override_current_user():
        return fake_user

    async def override_db():
        yield fake_db

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, fake_user, fake_db
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_exercise_suggestions_endpoint_passes_current_user_and_default_locale(dashboard_client, monkeypatch):
    client, fake_user, fake_db = dashboard_client
    called: dict[str, Any] = {}

    async def fake_get_exercise_suggestions(**kwargs: Any) -> list:
        called.update(kwargs)
        return []

    monkeypatch.setattr(dashboard_ep.dashboard_svc, "get_exercise_suggestions", fake_get_exercise_suggestions)

    res = await client.get("/v1/dashboard/exercise-suggestions")

    assert res.status_code == 200
    assert called == {
        "db": fake_db,
        "user_id": fake_user.id,
        "user": fake_user,
        "locale": "vi",
    }


@pytest.mark.asyncio
async def test_exercise_suggestions_endpoint_ignores_locale_query_to_keep_core_contract(
    dashboard_client,
    monkeypatch,
):
    client, _fake_user, _fake_db = dashboard_client
    called: dict[str, Any] = {}

    async def fake_get_exercise_suggestions(**kwargs: Any) -> list:
        called.update(kwargs)
        return []

    monkeypatch.setattr(dashboard_ep.dashboard_svc, "get_exercise_suggestions", fake_get_exercise_suggestions)

    res = await client.get("/v1/dashboard/exercise-suggestions?locale=en")

    assert res.status_code == 200
    assert called["locale"] == "vi"
