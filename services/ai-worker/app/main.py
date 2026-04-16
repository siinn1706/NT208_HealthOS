"""AI Worker — FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.api.generate import router as ai_router
from app.core.config import settings
from app.schemas.analysis import AnalyzeMealRequest, AnalyzeMealResponse
from app.services.food_detector_service import detect_food_nutrition, get_detector_runtime_status
from app.services.image_loader import ImageLoadError, load_image_from_url
from app.services.nutrition_mapper import map_to_healthos_nutrition

_LOGGER = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from app.services.food_detector_service import _load_class_db, _load_yolo_model

        _load_class_db(settings.class_names_path)
        _load_yolo_model()
        _LOGGER.info("food_detector_warmup_success")
    except Exception as exc:  # pragma: no cover - startup runtime path
        # Keep worker booting, fallback path can still handle requests.
        _LOGGER.warning("food_detector_warmup_failed reason=%s", exc)
    yield


app = FastAPI(title=settings.app_name, version="0.2.0", lifespan=lifespan)
app.include_router(ai_router)


@app.get("/health")
async def health() -> dict:
    detector_status = get_detector_runtime_status()
    return {
        "status": "ok",
        "service": "ai-worker",
        "debug": settings.debug,
        "detector": detector_status,
    }


@app.post("/analyze")
async def analyze_meal(body: AnalyzeMealRequest) -> AnalyzeMealResponse:
    """Analyze a meal image and return normalized nutrition result."""
    try:
        image = load_image_from_url(
            image_url=body.image_url,
            timeout_seconds=settings.ai_request_timeout_seconds,
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
