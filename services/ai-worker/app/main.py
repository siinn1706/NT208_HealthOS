"""AI Worker — FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.api.generate import router as ai_router
from app.core.config import settings
from app.schemas.analysis import AnalyzeMealRequest, AnalyzeMealResponse
from app.services import llm_proxy_service
from app.services.food_detector_service import detect_food_nutrition, get_detector_runtime_status
from app.services.image_loader import ImageLoadError, load_image_from_url
from app.services.nutrition_mapper import map_to_healthos_nutrition

_LOGGER = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from app.services.food_detector_service import _load_class_db

        _load_class_db(settings.class_names_path)
        # Keep startup health endpoints responsive on CPU-only hosts. The YOLO
        # model is loaded lazily by the first analysis request.
        _LOGGER.info("food_detector_metadata_warmup_success")
    except Exception as exc:  # pragma: no cover - startup runtime path
        # Keep worker booting; analysis requests return controlled failures if assets are unavailable.
        _LOGGER.warning("food_detector_metadata_warmup_failed reason=%s", exc)
    yield


app = FastAPI(title=settings.app_name, version="0.2.0", lifespan=lifespan)
app.include_router(ai_router)


@app.get("/health")
async def health() -> dict:
    """Liveness probe — returns 200 as long as the FastAPI app is running."""
    return {"status": "ok", "service": "ai-worker", "debug": settings.debug}


@app.get("/health/ready")
async def health_ready() -> dict:
    """Readiness probe — 503 when meal-analysis is enabled but no detector is available.

    Readiness rules:
      * ``ai_food_analysis_enabled=False`` → meal analysis is intentionally off;
        readiness only requires the FastAPI app to be alive. Chat/embeddings
        endpoints stay servable; meal-analysis enqueue is gated by core-be.
      * ``ai_food_analysis_enabled=True`` → the worker MUST have a detection
        backend (YOLO model file on disk OR primary food-analysis model
        loaded); otherwise return 503 so docker healthchecks, ``ai-check.sh``,
        and the core-be enqueue gate all flip red simultaneously.
    """
    detector_status = get_detector_runtime_status()
    yolo_status = detector_status.get("legacy_yolo", {}) or {}
    primary_status = detector_status.get("primary", {}) or {}
    yolo_available = bool(yolo_status.get("model_exists") or yolo_status.get("model_loaded"))
    primary_available = bool(primary_status.get("model_loaded"))

    body = {
        "status": "ok",
        "service": "ai-worker",
        "debug": settings.debug,
        "food_analysis_enabled": settings.ai_food_analysis_enabled,
        "detector": detector_status,
        "ai_proxy": "configured" if llm_proxy_service.is_configured() else "missing_config",
        "ai_proxy_model": settings.ai_proxy_model,
    }

    if settings.ai_food_analysis_enabled and not (yolo_available or primary_available):
        body["status"] = "not_ready"
        body["reason"] = (
            f"AI_FOOD_ANALYSIS_ENABLED=true but no detection backend available "
            f"(yolo_model_path={settings.yolo_model_path})."
        )
        raise HTTPException(status_code=503, detail=body)

    return body


@app.post("/analyze")
async def analyze_meal(body: AnalyzeMealRequest) -> AnalyzeMealResponse:
    """Analyze a meal image and return normalized nutrition result."""
    try:
        image = load_image_from_url(
            image_url=body.image_url,
            timeout_seconds=settings.ai_image_download_timeout_seconds,
        )
    except ImageLoadError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "IMAGE_LOAD_FAILED", "message": str(exc)},
        ) from exc

    try:
        raw = detect_food_nutrition(image)
        nutrition = map_to_healthos_nutrition(raw)
    except Exception as exc:  # pragma: no cover - model runtime path
        raise HTTPException(
            status_code=503,
            detail={"code": "ANALYSIS_FAILED", "message": f"Meal analysis failed: {exc}"},
        ) from exc

    return AnalyzeMealResponse(
        meal_id=body.meal_id,
        status="analyzed",
        nutrition=nutrition,
    )
