"""Celery application and tasks."""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "healthos",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.meal_analysis",
        "app.tasks.reminders",
        "app.tasks.data_export",
        "app.tasks.account_purge",
        "app.tasks.report_pdf",
        "app.tasks.maintenance",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Expire task results after 1 hour to prevent unbounded Redis growth
    result_expires=3600,
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
)


# B7 review P2-4 — single source of truth for the beat schedule.
# Each task module used to mutate `celery_app.conf.beat_schedule` at import
# time, which made the merged schedule order-dependent on Python's import
# order. Centralizing here removes the ambiguity.
celery_app.conf.beat_schedule = {
    # Reminders (P5)
    "materialize_reminders_horizon": {
        "task": "app.tasks.reminders.materialize_reminders_horizon",
        "schedule": 5 * 60,  # every 5 minutes
    },
    "fire_due_occurrences": {
        "task": "app.tasks.reminders.fire_due_occurrences",
        "schedule": 60,  # every minute
    },
    # Account purge (P9)
    "purge_expired_accounts": {
        "task": "app.tasks.account_purge.purge_expired_accounts",
        "schedule": crontab(hour=3, minute=0),  # daily at 03:00 UTC
    },
    # Blob janitor (review P1-3)
    "expire_export_blobs": {
        "task": "app.tasks.maintenance.expire_export_blobs",
        "schedule": crontab(hour=4, minute=0),  # daily at 04:00 UTC
    },
    "expire_report_pdf_blobs": {
        "task": "app.tasks.maintenance.expire_report_pdf_blobs",
        "schedule": crontab(hour=4, minute=15),
    },
}
