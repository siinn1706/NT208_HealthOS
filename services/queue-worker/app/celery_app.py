"""Queue Worker — Celery application factory."""
from celery import Celery
from celery.signals import task_failure
import os

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/2")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery_app = Celery(
    "healthos_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.wearable_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Expire task results after 1 hour to prevent unbounded Redis growth
    result_expires=3600,
    # Beat schedule — re-enable wearable sync when task is implemented
    # beat_schedule={
    #     "sync-wearable-every-15-min": {
    #         "task": "app.tasks.wearable_tasks.sync_all_users_wearable",
    #         "schedule": 900.0,
    #     },
    # },
)


@task_failure.connect
def on_task_failure(sender=None, task_id=None, exception=None, **kwargs):
    """Log task failures without exposing PHI from args, kwargs, or traceback."""
    import logging
    _logger = logging.getLogger("celery.task_failure")
    _logger.error(
        "task_failure task=%s task_id=%s exc_type=%s",
        getattr(sender, "name", "unknown"),
        task_id,
        type(exception).__name__ if exception else "unknown",
    )
