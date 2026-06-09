"""Liveness vs readiness regression tests.

Guards the split between ``/health`` (always 200, liveness) and
``/health/ready`` (conditional 503). Readiness behaviour depends on
``settings.ai_food_analysis_enabled``:

* enabled  → 503 when no YOLO / primary backend available
* disabled → 200 even with no detection backend (chat-only deployment)

Ops scripts (``infra/scripts/ai-check.sh``), docker healthchecks, and the
core-be meal-analysis enqueue gate all rely on these semantics.
"""
from typing import Any

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


_NO_BACKEND = {
    "primary": {"model_loaded": False},
    "crosscheck": {"model_loaded": False},
    "legacy_yolo": {"model_loaded": False, "model_exists": False},
}


def test_health_returns_200_regardless_of_detector_state(monkeypatch: Any) -> None:
    monkeypatch.setattr("app.main.get_detector_runtime_status", lambda: _NO_BACKEND)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-worker"


def test_health_ready_returns_200_when_yolo_present(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_food_analysis_enabled", True)
    monkeypatch.setattr(
        "app.main.get_detector_runtime_status",
        lambda: {
            "primary": {"model_loaded": False},
            "crosscheck": {"model_loaded": False},
            "legacy_yolo": {"model_loaded": True, "model_exists": True},
        },
    )
    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["detector"]["legacy_yolo"]["model_loaded"] is True


def test_health_ready_returns_200_when_primary_loaded(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_food_analysis_enabled", True)
    monkeypatch.setattr(
        "app.main.get_detector_runtime_status",
        lambda: {
            "primary": {"model_loaded": True},
            "crosscheck": {"model_loaded": False},
            "legacy_yolo": {"model_loaded": False, "model_exists": False},
        },
    )
    response = client.get("/health/ready")
    assert response.status_code == 200


def test_health_ready_returns_503_when_enabled_but_no_backend(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_food_analysis_enabled", True)
    monkeypatch.setattr("app.main.get_detector_runtime_status", lambda: _NO_BACKEND)
    response = client.get("/health/ready")
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["status"] == "not_ready"
    assert "AI_FOOD_ANALYSIS_ENABLED=true" in detail["reason"]


def test_health_ready_returns_200_when_disabled_and_no_backend(monkeypatch: Any) -> None:
    """Low-resource deployment (docker-compose.prod.no-ai.yml) must stay green."""
    monkeypatch.setattr(settings, "ai_food_analysis_enabled", False)
    monkeypatch.setattr("app.main.get_detector_runtime_status", lambda: _NO_BACKEND)
    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["food_analysis_enabled"] is False
