"""Tests for Phase 1: /health liveness + /health/ready readiness split."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _get_app():
    from app.main import app
    return app


def test_health_liveness_always_200():
    app = _get_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_ready_200_when_db_and_redis_healthy():
    app = _get_app()
    mock_conn = AsyncMock()
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=False)
    mock_conn.execute = AsyncMock(return_value=None)

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)

    with (
        patch("app.main.engine") as mock_engine,
        patch("app.adapters.redis_client.get_redis", return_value=mock_redis),
    ):
        mock_engine.connect.return_value = mock_conn
        with TestClient(app, raise_server_exceptions=False) as c:
            resp = c.get("/health/ready")

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_ready_503_when_db_down():
    app = _get_app()
    with patch("app.main.engine") as mock_engine:
        mock_engine.connect.side_effect = Exception("DB down")
        with TestClient(app, raise_server_exceptions=False) as c:
            resp = c.get("/health/ready")
    assert resp.status_code == 503
    assert resp.json()["db"] == "error"


def test_health_liveness_unaffected_when_db_down():
    """Liveness /health must stay 200 even when DB is unreachable."""
    app = _get_app()
    with patch("app.main.engine") as mock_engine:
        mock_engine.connect.side_effect = Exception("DB down")
        with TestClient(app, raise_server_exceptions=False) as c:
            resp = c.get("/health")
    assert resp.status_code == 200
