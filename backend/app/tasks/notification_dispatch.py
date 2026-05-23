"""Celery task — wraps the notification dispatch core.

PHI safety: logger.exception() is BANNED here. Use logger.error() with
type(exc).__name__ only — never exc.args or str(exc).
"""
from __future__ import annotations

import logging

from celery import Task

from app.services.notification_dispatch import (
    EnvelopeValidationError,
    dispatch,
)
from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.notification_dispatch.dispatch_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def dispatch_notification(self: Task, event: dict) -> dict:
    """Dispatch a notification.requested event to all requested channels.

    Per-channel isolation: a failure in one channel does not abort others.
    Retry only when ALL channels returned a transient `failed` status.
    On EnvelopeValidationError: log event_id only, mark as permanent failure.
    """
    event_id = (event.get("metadata") or {}).get("event_id", "unknown")
    logger.info("dispatch_notification started event_id=%s", event_id)

    try:
        result = dispatch(event)
    except EnvelopeValidationError:
        logger.error("dispatch_notification invalid_envelope event_id=%s", event_id)
        # Invalid envelope is permanent — no retry
        raise

    statuses = [r.status for r in result.results]
    all_transient_failed = statuses and all(s == "failed" for s in statuses)

    if all_transient_failed:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            logger.error("dispatch_notification max_retries_exceeded event_id=%s", event_id)
            raise

    logger.info(
        "dispatch_notification completed event_id=%s channels=%s statuses=%s",
        event_id,
        result.results and [r.channel for r in result.results],
        statuses,
    )
    return result.to_dict()
