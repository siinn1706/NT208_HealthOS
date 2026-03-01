"""Wearable sync Celery tasks."""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.wearable_tasks.sync_wearable_data")
def sync_wearable_data(user_id: str, provider: str) -> dict:
    """
    Pull data from Wearable API for a single user and upsert via Core BE.

    TODO:
      1. Fetch credentials/token for user+provider from Core BE
      2. Call wearable provider API (Apple Health, Google Fit, Garmin, Fitbit)
      3. Normalize response to HealthMetric format
      4. POST/PATCH Core BE /v1/health-metrics (batch upsert)
      5. Evaluate alert rules → if triggered: enqueue notification task
    """
    raise NotImplementedError("sync_wearable_data not yet implemented")


@celery_app.task(name="app.tasks.wearable_tasks.sync_all_users_wearable")
def sync_all_users_wearable() -> None:
    """Scheduled task: fan-out sync_wearable_data for all connected users."""
    # TODO: GET Core BE /v1/devices?connected=true, then fan-out
    raise NotImplementedError("sync_all_users_wearable not yet implemented")
