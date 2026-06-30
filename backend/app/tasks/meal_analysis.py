"""Meal analysis Celery tasks."""
import logging
import uuid
from typing import Any

import httpx
from celery import Task

logger = logging.getLogger(__name__)

from app.adapters.database import get_sync_db_context
from app.adapters.storage import presign_storage_url
from app.core.config import settings
from app.models.core import Meal, MealStatusEnum
from app.tasks import celery_app


_NUMERIC_NUTRITION_KEYS = {
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "saturates_g",
    "sugar_g",
    "salt_g",
    "fiber_g",
    "confidence",
    "calorie_min",
    "calorie_max",
}
_STRING_NUTRITION_KEYS = {"dish_name", "serving_type", "source", "portion_estimate"}
_NUMERIC_INGREDIENT_KEYS = {
    "grams",
    "kcal",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "confidence",
}
_STRING_INGREDIENT_KEYS = {"name", "ingredient_name", "ingredient_name_en"}
_NUMERIC_PORTION_KEYS = {
    "scale",
    "multiplier",
    "calories",
    "calorie_min",
    "calorie_max",
    "protein_g",
    "carbs_g",
    "fat_g",
}
_STRING_PORTION_KEYS = {"value", "label", "serving_type"}


def _meal_analysis_timeout_seconds() -> float:
    """Use a longer floor for image analysis on CPU-only local workers."""
    return max(
        float(settings.ai_worker_timeout_seconds or 0.0),
        float(settings.meal_analysis_worker_timeout_seconds or 0.0),
    )


def _ai_worker_error_payload(exc: httpx.HTTPError) -> dict[str, dict[str, str]]:
    if isinstance(exc, httpx.TimeoutException):
        return {
            "__error__": {
                "code": "AI_WORKER_TIMEOUT",
                "message": "AI worker timed out while analyzing the image",
            }
        }
    return {
        "__error__": {
            "code": "AI_WORKER_FAILED",
            "message": "AI worker returned error",
        }
    }


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _validate_ingredient(data: Any) -> dict[str, float | str] | None:
    if not isinstance(data, dict):
        return None
    normalized: dict[str, float | str] = {}
    for key, value in data.items():
        if key in _NUMERIC_INGREDIENT_KEYS and _is_number(value):
            normalized[key] = float(value)
        elif key in _STRING_INGREDIENT_KEYS and isinstance(value, str) and value.strip():
            normalized[key] = value.strip()
    return normalized or None


def _validate_portion_option(data: Any) -> dict[str, float | str] | None:
    if not isinstance(data, dict):
        return None
    normalized: dict[str, float | str] = {}
    for key, value in data.items():
        if key in _NUMERIC_PORTION_KEYS and _is_number(value):
            normalized[key] = float(value)
        elif key in _STRING_PORTION_KEYS and isinstance(value, str) and value.strip():
            normalized[key] = value.strip()
    return normalized or None


def _validate_warnings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value[:20] if isinstance(item, str) and item.strip()]


def _validate_nutrition(data: dict) -> dict:
    """Sanitize AI Worker nutrition response to expected schema."""
    if not isinstance(data, dict):
        return {}
    normalized: dict[str, Any] = {}
    for key, value in data.items():
        if key in _NUMERIC_NUTRITION_KEYS and _is_number(value):
            normalized[key] = float(value)
        elif key in _STRING_NUTRITION_KEYS and isinstance(value, str):
            normalized[key] = value
        elif key == "ingredients" and isinstance(value, list):
            ingredients = [
                ingredient
                for ingredient in (_validate_ingredient(item) for item in value)
                if ingredient is not None
            ]
            if ingredients:
                normalized["ingredients"] = ingredients
        elif key == "portion_options" and isinstance(value, list):
            options = [
                option
                for option in (_validate_portion_option(item) for item in value)
                if option is not None
            ]
            if options:
                normalized["portion_options"] = options
        elif key == "warnings":
            warnings = _validate_warnings(value)
            if warnings:
                normalized["warnings"] = warnings
    return normalized


def update_meal_status_sync(
    meal_id: uuid.UUID,
    status: MealStatusEnum,
    nutrition_result: dict | None = None,
) -> None:
    """Update meal record with analysis result (sync version for Celery)."""
    from sqlalchemy import update

    with get_sync_db_context() as db:
        stmt = (
            update(Meal)
            .where(Meal.id == meal_id)
            .values(status=status, nutrition_result=nutrition_result)
        )
        db.execute(stmt)
        db.commit()


def _build_ai_worker_payload(meal_id: str, image_url: str) -> dict[str, str]:
    """Build the worker payload with a short-lived download URL."""
    return {"meal_id": meal_id, "image_url": presign_storage_url(image_url) or image_url}


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def analyze_meal_image(self: Task, meal_id: str, image_url: str) -> dict:
    """Analyze meal image via AI Worker and update meal record."""
    meal_uuid = uuid.UUID(meal_id)
    logger.info("meal_analysis started meal_id=%s attempt=%s", meal_id, self.request.retries + 1)

    try:
        # Call AI Worker
        with httpx.Client(timeout=_meal_analysis_timeout_seconds()) as client:
            response = client.post(
                f"{settings.ai_worker_url}/analyze",
                json=_build_ai_worker_payload(meal_id, image_url),
            )
            response.raise_for_status()
            result = response.json()

        # Update meal with result
        nutrition = _validate_nutrition(result.get("nutrition", {}))
        update_meal_status_sync(
            meal_uuid,
            MealStatusEnum.ANALYZED,
            nutrition,
        )
        logger.info("meal_analysis completed meal_id=%s status=ANALYZED", meal_id)

        return {
            "meal_id": meal_id,
            "status": "completed",
            "nutrition": nutrition,
        }

    except httpx.HTTPError as exc:
        # Keep PROCESSING during retries; only stamp FAILED on terminal attempt.
        if self.request.retries >= self.max_retries:
            update_meal_status_sync(
                meal_uuid,
                MealStatusEnum.FAILED,
                _ai_worker_error_payload(exc),
            )
            logger.error(
                "meal_analysis failed meal_id=%s attempt=%s exc_type=%s",
                meal_id, self.request.retries + 1, type(exc).__name__,
            )
        else:
            logger.warning(
                "meal_analysis retry meal_id=%s attempt=%s/%s exc_type=%s",
                meal_id, self.request.retries + 1, self.max_retries, type(exc).__name__,
            )
        raise self.retry(exc=exc)
    except Exception as exc:
        # Stamp FAILED only on terminal attempt — same guard as httpx.HTTPError branch.
        if self.request.retries >= self.max_retries:
            update_meal_status_sync(
                meal_uuid,
                MealStatusEnum.FAILED,
                {"__error__": {"code": "UNKNOWN", "message": "Analysis task failed"}},
            )
            logger.error(
                "meal_analysis failed meal_id=%s attempt=%s exc_type=%s",
                meal_id, self.request.retries + 1, type(exc).__name__,
            )
        else:
            logger.warning(
                "meal_analysis retry meal_id=%s attempt=%s/%s exc_type=%s",
                meal_id, self.request.retries + 1, self.max_retries, type(exc).__name__,
            )
        raise self.retry(exc=exc)
