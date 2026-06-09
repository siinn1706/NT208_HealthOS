"""Ai-worker readiness probe used to fail-fast meal-analysis enqueues.

The AI worker exposes ``/health/ready``:

  * 200 when a detection backend is available OR meal analysis is intentionally
    disabled (``AI_FOOD_ANALYSIS_ENABLED=false`` low-resource deployment).
  * 503 with ``detail.reason`` when food analysis is enabled but no YOLO /
    primary detector can serve a request.

Without this probe, ``analyze_meal_image.delay(...)`` succeeds (Celery just
enqueues), Redis holds the job, and the worker burns its three retries before
the user-facing meal row is finally stamped ``FAILED``. That round-trip easily
exceeds 30 s and surfaces as a generic ``AI_WORKER_FAILED``.

Calling :func:`assert_ai_worker_ready_for_meal_analysis` BEFORE enqueueing
turns that delayed failure into an immediate 503 ``MEAL_ANALYSIS_UNAVAILABLE``
with a clear message the frontend can show to the user.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import settings
from app.exceptions import ApiException

_LOGGER = logging.getLogger(__name__)
_READINESS_TIMEOUT_SECONDS = 2.0


def _unavailable(message: str) -> ApiException:
    return ApiException(
        status_code=503,
        code="MEAL_ANALYSIS_UNAVAILABLE",
        message=message,
    )


async def assert_ai_worker_ready_for_meal_analysis() -> None:
    """Raise ``MEAL_ANALYSIS_UNAVAILABLE`` (503) when the worker can't serve."""
    url = f"{settings.ai_worker_url.rstrip('/')}/health/ready"
    try:
        async with httpx.AsyncClient(timeout=_READINESS_TIMEOUT_SECONDS) as client:
            response = await client.get(url)
    except (httpx.RequestError, httpx.TimeoutException) as exc:
        _LOGGER.warning("ai_worker_readiness_probe_failed url=%s err=%s", url, exc)
        raise _unavailable("AI worker is not reachable.") from exc

    if response.status_code >= 500:
        reason: str | None = None
        try:
            body = response.json()
        except ValueError:
            body = None
        if isinstance(body, dict):
            detail = body.get("detail")
            if isinstance(detail, dict):
                reason = detail.get("reason") or detail.get("message")
        raise _unavailable(reason or "AI worker reports detection backend not ready.")
