"""Notification dispatch Celery tasks."""
import logging

from app.celery_app import celery_app

logger = logging.getLogger("healthos.queue_worker")


@celery_app.task(name="app.tasks.notification_tasks.send_notification")
def send_notification(event: dict) -> dict:
    """
    Dispatch a notification.requested event to the appropriate channel.

    event: matches contracts/events/notification-requested.json schema

    TODO:
      1. Validate event schema
      2. Route by channel: email → SMTP, push → Firebase, sms → SMS gateway
      3. Record delivery status back to Core BE
    """
    event_id = event.get("metadata", {}).get("event_id")
    logger.warning(
      "send_notification is not implemented yet",
      extra={"event_id": event_id, "has_payload": bool(event.get("payload"))},
    )
    return {
      "status": "not_implemented",
      "event_id": event_id,
      "message": "Notification dispatch is not implemented yet.",
    }
