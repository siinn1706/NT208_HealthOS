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
from app.schemas.dashboard import DashboardAiAdviceDTO


@pytest_asyncio.fixture
async def dashboard_ai_client():
    fake_user = type("User", (), {"id": uuid.uuid4(), "email": "advice@local"})()
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


def _advice() -> DashboardAiAdviceDTO:
    return DashboardAiAdviceDTO(
        id="ai-advice-test",
        status="ready",
        category="activity",
        priority="medium",
        title="Take a light walk",
        body="A short walk can help after a high-calorie day.",
        actions=[{"id": "walk", "label": "Walk", "type": "walk"}],
        evidence=[{"metric": "Steps", "value": 1200, "unit": "steps"}],
        source="ai",
        rag_sources=[{"title": "WHO activity", "organization": "WHO", "url": "https://example.test"}],
        generated_at="2026-06-30T12:00:00Z",
        expires_at="2026-06-30T12:45:00Z",
        disclaimer="Informational only.",
    )


@pytest.mark.asyncio
async def test_dashboard_ai_advice_endpoint_passes_query_and_returns_data_envelope(
    dashboard_ai_client,
    monkeypatch,
):
    client, fake_user, fake_db = dashboard_ai_client
    called: dict[str, Any] = {}

    async def fake_get_dashboard_ai_advice(**kwargs: Any) -> DashboardAiAdviceDTO:
        called.update(kwargs)
        return _advice()

    monkeypatch.setattr(
        dashboard_ep.dashboard_ai_advice_svc,
        "get_dashboard_ai_advice",
        fake_get_dashboard_ai_advice,
    )

    response = await client.get("/v1/dashboard/ai-advice?locale=en&surface=mobile")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == "ai-advice-test"
    assert called == {
        "db": fake_db,
        "user": fake_user,
        "locale": "en",
        "surface": "mobile",
    }
