"""AI Worker — FastAPI application entry point."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException

from app.api.generate import router as ai_router
from app.core.config import settings
from app.schemas.analysis import AnalyzeMealRequest, AnalyzeMealResponse
from app.services.food_detector_service import detect_food_nutrition
from app.services.image_loader import ImageLoadError, load_image_from_url
from app.services.nutrition_mapper import map_to_healthos_nutrition

app = FastAPI(title=settings.app_name, version="0.2.0")
app.include_router(ai_router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "ai-worker",
        "debug": settings.debug,
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
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        raw = detect_food_nutrition(image)
        nutrition = map_to_healthos_nutrition(raw)
    except Exception as exc:  # pragma: no cover - model runtime path
        raise HTTPException(status_code=503, detail=f"Meal analysis failed: {exc}") from exc

    return AnalyzeMealResponse(
        meal_id=body.meal_id,
        status="analyzed",
        nutrition=nutrition,
    )
