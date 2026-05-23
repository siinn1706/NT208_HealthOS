"""Meal analysis Celery tasks."""
import logging
import uuid

import httpx
from celery import Task

logger = logging.getLogger(__name__)

from app.adapters.database import get_sync_db_context
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
}
_STRING_NUTRITION_KEYS = {"dish_name", "serving_type", "source"}


def _validate_nutrition(data: dict) -> dict:
    """Sanitize AI Worker nutrition response to expected schema."""
    if not isinstance(data, dict):
        return {}
    normalized: dict[str, float | str] = {}
    for key, value in data.items():
        if key in _NUMERIC_NUTRITION_KEYS and isinstance(value, (int, float)):
            normalized[key] = float(value)
        elif key in _STRING_NUTRITION_KEYS and isinstance(value, str):
            normalized[key] = value
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


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def analyze_meal_image(self: Task, meal_id: str, image_url: str) -> dict:
    """Analyze meal image via AI Worker and update meal record."""
    meal_uuid = uuid.UUID(meal_id)
    logger.info("meal_analysis started meal_id=%s attempt=%s", meal_id, self.request.retries + 1)

    try:
        # Call AI Worker
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{settings.ai_worker_url}/analyze",
                json={"meal_id": meal_id, "image_url": image_url},
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
                {"__error__": {"code": "AI_WORKER_FAILED", "message": "AI worker returned error"}},
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
