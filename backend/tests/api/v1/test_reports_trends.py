from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.services import insights as insight_svc


def _trend_payload(metric: str) -> dict:
    return {
        "metric": metric,
        "metric_label": metric.upper(),
        "unit": "bpm",
        "period": "30d",
        "data_points": [],
        "trend_line": [],
        "prediction": [],
        "anomalies": [],
        "trend": "stable",
        "change_percent": 0,
        "ai_summary": "TREND_NO_DATA",
        "ai_summary_params": {},
    }


@pytest.fixture
def authenticated_user() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="reports@example.com",
        hashed_password="fake",
        profile=None,
    )


@pytest_asyncio.fixture
async def authenticated_client(authenticated_user: SimpleNamespace):
    async def override_get_current_user() -> SimpleNamespace:
        return authenticated_user

    async def override_db():
        yield object()

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_report_trends_requires_auth() -> None:
    app.dependency_overrides.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/v1/reports/trends/batch?metrics=heart_rate&period=30d")

    assert res.status_code == 401


@pytest.mark.asyncio
async def test_single_report_trend_still_returns_data(
    authenticated_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_trend(_db: object, _user: object, metric: str, period: str) -> dict:
        assert metric == "heart_rate"
        assert period == "30d"
        return _trend_payload(metric)

    monkeypatch.setattr(insight_svc, "get_trend_analysis", fake_trend)

    res = await authenticated_client.get("/v1/reports/trends?metric=heart_rate&period=30d")

    assert res.status_code == 200
    assert res.json()["data"]["metric"] == "heart_rate"


@pytest.mark.asyncio
async def test_batch_report_trends_returns_metric_map(
    authenticated_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_batch(_db: object, _user: object, metrics: list[str], period: str) -> dict:
        assert metrics == ["heart_rate", "steps"]
        assert period == "30d"
        return {metric: _trend_payload(metric) for metric in metrics}

    monkeypatch.setattr(insight_svc, "get_trend_analysis_batch", fake_batch)

    res = await authenticated_client.get(
        "/v1/reports/trends/batch?metrics=heart_rate,steps&period=30d"
    )

    assert res.status_code == 200
    data = res.json()["data"]
    assert list(data) == ["heart_rate", "steps"]
    assert data["heart_rate"]["metric"] == "heart_rate"
    assert data["steps"]["metric"] == "steps"
    assert {
        "metric",
        "metric_label",
        "unit",
        "period",
        "data_points",
        "trend_line",
        "prediction",
        "anomalies",
        "trend",
        "change_percent",
        "ai_summary",
        "ai_summary_params",
    }.issubset(data["heart_rate"])


@pytest.mark.asyncio
@pytest.mark.parametrize("metrics", ["", "unknown"])
async def test_batch_report_trends_rejects_no_supported_metrics(
    authenticated_client: AsyncClient,
    metrics: str,
) -> None:
    res = await authenticated_client.get(
        f"/v1/reports/trends/batch?metrics={metrics}&period=30d"
    )

    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_batch_report_trends_requires_metrics_param(
    authenticated_client: AsyncClient,
) -> None:
    res = await authenticated_client.get("/v1/reports/trends/batch?period=30d")

    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_batch_report_trends_omits_unsupported_tokens(
    authenticated_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_batch(_db: object, _user: object, metrics: list[str], _period: str) -> dict:
        assert metrics == ["heart_rate"]
        return {"heart_rate": _trend_payload("heart_rate")}

    monkeypatch.setattr(insight_svc, "get_trend_analysis_batch", fake_batch)

    res = await authenticated_client.get(
        "/v1/reports/trends/batch?metrics=unknown,heart_rate,unknown&period=30d"
    )

    assert res.status_code == 200
    assert list(res.json()["data"]) == ["heart_rate"]


@pytest.mark.asyncio
async def test_batch_report_trends_normalizes_and_dedupes_metrics(
    authenticated_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_batch(_db: object, _user: object, metrics: list[str], _period: str) -> dict:
        assert metrics == ["steps", "heart_rate"]
        return {metric: _trend_payload(metric) for metric in metrics}

    monkeypatch.setattr(insight_svc, "get_trend_analysis_batch", fake_batch)

    res = await authenticated_client.get(
        "/v1/reports/trends/batch",
        params={"metrics": " STEPS , heart_rate , steps , unknown ", "period": "30d"},
    )

    assert res.status_code == 200
    assert list(res.json()["data"]) == ["steps", "heart_rate"]
