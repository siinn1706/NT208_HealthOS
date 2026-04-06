"""Meal analysis Celery tasks."""
import uuid

import httpx
from celery import Task

from app.adapters.database import get_sync_db_context
from app.core.config import settings
from app.models.core import Meal, MealStatusEnum
from app.tasks import celery_app


_NUTRITION_KEYS = {"calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "confidence"}


def _validate_nutrition(data: dict) -> dict:
    """Sanitize AI Worker nutrition response to expected schema."""
    if not isinstance(data, dict):
        return {}
    return {k: float(v) for k, v in data.items() if k in _NUTRITION_KEYS and isinstance(v, (int, float))}


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

        return {
            "meal_id": meal_id,
            "status": "completed",
            "nutrition": nutrition,
        }

    except httpx.HTTPError as exc:
        # Mark as failed
        update_meal_status_sync(meal_uuid, MealStatusEnum.FAILED, None)
        raise self.retry(exc=exc)
    except Exception as exc:
        update_meal_status_sync(meal_uuid, MealStatusEnum.FAILED, None)
        raise self.retry(exc=exc)
