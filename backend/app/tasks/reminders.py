"""B7 P5 — Celery beat tasks for reminders.

Two beat-scheduled jobs:

  * `materialize_reminders_horizon` (every 5 minutes) — sweeps active reminders
    and inserts up to 14 occurrence rows for the next 7 days. Idempotent on
    `(reminder_id, scheduled_at)`.
  * `fire_due_occurrences` (every 1 minute) — finds `pending|snoozed` rows
    whose `scheduled_at <= now()`, marks them `fired`, and inserts a
    `Notification` so the popover/badge surfaces them.

Both run in the synchronous Celery worker context (not the async FastAPI
session) and use the sync DB context manager.
"""
from __future__ import annotations

import datetime
import logging

from sqlalchemy import select, update

from app.adapters.database import get_sync_db_context
from app.core.metrics import record_reminder_fire
from app.models.core import (
    Notification,
    NotificationKindEnum,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
)
from app.services.reminder_recurrence import compute_next_n
from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.reminders.materialize_reminders_horizon")
def materialize_reminders_horizon() -> dict:
    """Top up occurrence rows for every active reminder, idempotently."""
    inserted = 0
    swept = 0
    with get_sync_db_context() as db:
        active = db.execute(
            select(Reminder).where(Reminder.is_active.is_(True), Reminder.done.is_(False))
        ).scalars().all()
        for reminder in active:
            swept += 1
            try:
                slots = compute_next_n(reminder)
            except Exception:
                logger.exception("compute_next_n failed for reminder %s", reminder.id)
                continue
            if not slots:
                continue
            existing = set(
                row[0]
                for row in db.execute(
                    select(ReminderOccurrence.scheduled_at).where(
                        ReminderOccurrence.reminder_id == reminder.id,
                        ReminderOccurrence.scheduled_at.in_(slots),
                    )
                ).all()
            )
            for slot in slots:
                if slot in existing:
                    continue
                db.add(
                    ReminderOccurrence(
                        reminder_id=reminder.id,
                        scheduled_at=slot,
                        status=ReminderOccurrenceStatusEnum.PENDING.value,
                    )
                )
                inserted += 1
            # B7 review P2-3 — denormalized pointer must never be in the past.
            # Filter to future slots before `min(...)`; if all slots are past
            # (e.g. a `once` reminder whose start_date already elapsed and is
            # waiting for the user to mark it done), leave the pointer NULL.
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            future_slots = [s for s in slots if s >= now_utc]
            reminder.next_occurrence_at = min(future_slots) if future_slots else None
    return {"reminders": swept, "occurrences_inserted": inserted}


@celery_app.task(name="app.tasks.reminders.fire_due_occurrences")
def fire_due_occurrences() -> dict:
    """Convert due `pending|snoozed` occurrences into `fired` + a Notification row.

    B7 review P1-1 — atomic claim. Two concurrent beat workers (HA misconfig
    or a slow run that overlaps the next minute's tick) used to both select
    the same rows and insert duplicate notifications. The previous
    `IntegrityError` handler was dead code because Notification has no unique
    constraint. Now we issue a single `UPDATE … RETURNING` against rows
    locked with `FOR UPDATE SKIP LOCKED`, which gives this worker exclusive
    ownership of every row it returns. Notifications are inserted only for
    rows we actually claimed.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    fired_count = 0
    pending_statuses = (
        ReminderOccurrenceStatusEnum.PENDING.value,
        ReminderOccurrenceStatusEnum.SNOOZED.value,
    )
    with get_sync_db_context() as db:
        # Stage 1: claim a batch of due rows atomically. Using a CTE +
        # `WHERE id IN (subselect FOR UPDATE SKIP LOCKED)` matches the
        # standard Postgres "queue" pattern: concurrent workers skip rows
        # already locked by a peer rather than waiting on them.
        #
        # Defense-in-depth (Medication Hub review H5): join `Reminder` and
        # require `is_active=True`. Pause already cancels pending occurrences
        # to SKIPPED before commit, but any drift between a reminder's state
        # and its occurrences (partial failure, manual DB edit, race against
        # a long-running pause transaction) would otherwise let a "paused"
        # medication still send a notification. Materializer already filters
        # `is_active`; the firing query now matches.
        claim_subquery = (
            select(ReminderOccurrence.id)
            .join(Reminder, Reminder.id == ReminderOccurrence.reminder_id)
            .where(
                Reminder.is_active.is_(True),
                ReminderOccurrence.scheduled_at <= now,
                ReminderOccurrence.status.in_(pending_statuses),
            )
            .order_by(ReminderOccurrence.scheduled_at.asc())
            .limit(500)
            .with_for_update(of=ReminderOccurrence, skip_locked=True)
        )
        claimed_ids = [row[0] for row in db.execute(claim_subquery).all()]
        if not claimed_ids:
            return {"fired": 0}

        # Stage 2: flip the claimed rows to `fired` in a single statement.
        # SKIP LOCKED on the subquery guarantees no peer worker grabbed
        # these rows; the UPDATE is therefore conflict-free.
        db.execute(
            update(ReminderOccurrence)
            .where(ReminderOccurrence.id.in_(claimed_ids))
            .values(
                status=ReminderOccurrenceStatusEnum.FIRED.value,
                fired_at=now,
            )
        )
        db.flush()

        # Stage 3: load the freshly-claimed rows + their parent reminders so
        # we can insert one Notification each. We re-select to get the live
        # tuples (and parent eagerly).
        claimed = db.execute(
            select(ReminderOccurrence).where(ReminderOccurrence.id.in_(claimed_ids))
        ).scalars().all()
        record_reminder_fire("claimed")
        for occ in claimed:
            reminder = db.get(Reminder, occ.reminder_id)
            if reminder is None:
                record_reminder_fire("skipped")
                continue
            notif = Notification(
                user_id=reminder.user_id,
                title=reminder.title,
                body=_fire_body(reminder),
                kind=NotificationKindEnum.REMINDER.value,
                reference_id=occ.id,
                link=f"/dashboard/reminders?occurrence={occ.id}",
            )
            db.add(notif)
            db.flush()
            occ.notification_id = notif.id
            fired_count += 1
            record_reminder_fire("fired")
    return {"fired": fired_count}


def _fire_body(reminder: Reminder) -> str:
    """Notification body — short, locale-neutral; FE can localize via `kind`."""
    return reminder.note or f"Time for: {reminder.title}"


# B7 review P2-4 — beat schedule is registered once in `app/tasks/__init__.py`
# (single source of truth). Don't mutate `celery_app.conf.beat_schedule` here.
