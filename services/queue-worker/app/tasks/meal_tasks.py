"""Meal-related Celery tasks."""
import logging

from app.celery_app import celery_app

logger = logging.getLogger("healthos.queue_worker")


@celery_app.task(name="app.tasks.meal_tasks.process_meal_image", bind=True, max_retries=3)
def process_meal_image(self, meal_id: str, image_url: str, user_id: str) -> dict:
    """
    Trigger AI Worker to analyze a meal image, then update Core BE with result.

    TODO:
      1. POST to AI_WORKER_URL/analyze with { meal_id, image_url }
      2. On success: PATCH Core BE /v1/meals/{meal_id} with nutrition_result
      3. Core BE publishes WS event meal.analyzed to FE
      4. On failure: retry or mark meal as failed
    """
    logger.warning(
      "process_meal_image is not implemented yet",
      extra={"meal_id": meal_id, "image_url": image_url, "user_id": user_id},
    )
    return {
      "status": "not_implemented",
      "meal_id": meal_id,
      "user_id": user_id,
      "message": "Meal image processing pipeline is not implemented yet.",
    }
