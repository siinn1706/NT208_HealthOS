"""Tests for Phase 1: /metrics guard and /health split."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_metrics_blocked_without_token(monkeypatch):
    monkeypatch.setenv("METRICS_ALLOW_LOCAL", "false")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.core import config as cfg
    cfg.settings.metrics_allow_local = False
    cfg.settings.metrics_token = None
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/metrics")
    assert resp.status_code == 404


def test_metrics_allowed_with_correct_token(monkeypatch):
    from app.core import config as cfg
    cfg.settings.metrics_token = "secret123"
    cfg.settings.metrics_allow_local = False
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/metrics", headers={"X-Metrics-Token": "secret123"})
    assert resp.status_code == 200


def test_metrics_blocked_with_wrong_token(monkeypatch):
    from app.core import config as cfg
    cfg.settings.metrics_token = "secret123"
    cfg.settings.metrics_allow_local = False
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/metrics", headers={"X-Metrics-Token": "wrong"})
    assert resp.status_code == 404


def test_health_always_200():
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_ready_503_when_db_down():
    from app.main import app
    with patch("app.adapters.database.engine") as mock_engine:
        mock_engine.connect.side_effect = Exception("DB down")
        with TestClient(app, raise_server_exceptions=False) as c:
            resp = c.get("/health/ready")
    assert resp.status_code == 503
    assert resp.json()["db"] == "error"
