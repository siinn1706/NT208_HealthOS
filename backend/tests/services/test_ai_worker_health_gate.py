"""Regression tests for the ai-worker readiness gate used by meal-analysis enqueue."""
from __future__ import annotations

import httpx
import pytest

from app.exceptions import ApiException
from app.services import ai_worker_health


class _StubResponse:
    def __init__(self, status_code: int, body: dict | None = None) -> None:
        self.status_code = status_code
        self._body = body
        self.content = b"x" if body is not None else b""

    def json(self) -> dict:
        if self._body is None:
            raise ValueError("no body")
        return self._body


class _StubAsyncClient:
    def __init__(self, response: _StubResponse | None = None, raise_exc: Exception | None = None):
        self._response = response
        self._raise_exc = raise_exc

    async def __aenter__(self) -> "_StubAsyncClient":
        return self

    async def __aexit__(self, *_exc_info) -> None:
        return None

    async def get(self, _url: str) -> _StubResponse:
        if self._raise_exc is not None:
            raise self._raise_exc
        assert self._response is not None
        return self._response


@pytest.mark.asyncio
async def test_gate_passes_on_200(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ai_worker_health.httpx,
        "AsyncClient",
        lambda timeout: _StubAsyncClient(response=_StubResponse(200, {"status": "ok"})),
    )
    await ai_worker_health.assert_ai_worker_ready_for_meal_analysis()


@pytest.mark.asyncio
async def test_gate_raises_503_when_worker_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    body = {"detail": {"status": "not_ready", "reason": "YOLO model missing"}}
    monkeypatch.setattr(
        ai_worker_health.httpx,
        "AsyncClient",
        lambda timeout: _StubAsyncClient(response=_StubResponse(503, body)),
    )
    with pytest.raises(ApiException) as exc_info:
        await ai_worker_health.assert_ai_worker_ready_for_meal_analysis()
    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "MEAL_ANALYSIS_UNAVAILABLE"
    assert "YOLO model missing" in exc_info.value.detail["message"]


@pytest.mark.asyncio
async def test_gate_raises_503_when_worker_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ai_worker_health.httpx,
        "AsyncClient",
        lambda timeout: _StubAsyncClient(raise_exc=httpx.ConnectError("connection refused")),
    )
    with pytest.raises(ApiException) as exc_info:
        await ai_worker_health.assert_ai_worker_ready_for_meal_analysis()
    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "MEAL_ANALYSIS_UNAVAILABLE"
    assert "not reachable" in exc_info.value.detail["message"]


@pytest.mark.asyncio
async def test_gate_falls_back_to_generic_message_when_body_unparseable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ai_worker_health.httpx,
        "AsyncClient",
        lambda timeout: _StubAsyncClient(response=_StubResponse(503, None)),
    )
    with pytest.raises(ApiException) as exc_info:
        await ai_worker_health.assert_ai_worker_ready_for_meal_analysis()
    assert exc_info.value.detail["code"] == "MEAL_ANALYSIS_UNAVAILABLE"
    assert "detection backend not ready" in exc_info.value.detail["message"]
