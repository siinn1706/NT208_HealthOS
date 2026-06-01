"""Medication Hub — daily refill / review signals.

Runs once per day (06:00 UTC). For each `active` plan:

  * **Refill** — compute `daily_rate` from the active child reminders, project
    `days_remaining`, and fire **threshold-crossing** notifications. The plan
    row carries `last_refill_alert_threshold` so the user gets exactly one
    notification per warning level per supply cycle. Reset on `log_refill`.

  * **Review** — fire when `review_due_at` is within the lead window (and we
    haven't already notified for that lead today).

Idempotency strategy:
  * **Refill**: persistent — `MedicationPlan.last_refill_alert_threshold`
    survives across runs and across the same supply cycle.
  * **Review**: per-day — uses the `(user_id, kind, reference_id, today)`
    Notification scan. The narrow scope (one notification per plan per day)
    keeps the contention surface small even with two beat workers.

Notifications go through `notifications._validate_link` so the deep-link
allowlist is honored. Every auto-fired notification is also recorded as an
`AuditLog` event so a "why did I get this?" question has an answer.

The 1-minute `fire_due_occurrences` and 5-minute `materialize_reminders_horizon`
keep driving every dose firing — this task only adds the *refill / review*
notification class.
"""
from __future__ import annotations

import datetime
import logging
import uuid

from sqlalchemy import cast, func, select, update
from sqlalchemy.types import Date

from app.adapters.database import get_sync_db_context
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import (
    MedicationPlan,
    Notification,
    NotificationKindEnum,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    ReminderRepeatEnum,
)
from app.services.notifications import _validate_link
from app.tasks import celery_app

logger = logging.getLogger(__name__)


# Alert thresholds in days remaining, **descending**. The crossing detector
# fires the most-urgent threshold the user has crossed since their last alert
# for this supply cycle, so a supply that drops 8 → 5 still triggers the
# 7-day alert (it would not under the old `days_remaining in {...}` check).
_ALERT_THRESHOLDS_DAYS = (7, 3, 1, 0)
# Stretch: review reminders fire 7 days before due.
_REVIEW_LEAD_DAYS = 7
# Approximations used to amortize weekly / monthly schedules into a daily rate
# (review H7). Keep them named so the docstring stays honest about the
# assumption — neither has to be exact, the refill projection is conservative
# guidance, not pharmacy dispensing math.
_DAYS_PER_WEEK = 7.0
_DAYS_PER_MONTH = 30.0


def _doses_per_day(reminders: list[Reminder]) -> float:
    """Daily dose rate, **amortized** across weekly / monthly schedules.

    Each active child reminder contributes:
      * `1.0` for `daily`
      * `popcount(weekday_mask) / 7` for `weekly` (legacy 0-mask is 7/7=1.0)
      * `1 / 30` for `monthly`
      * `0.0` for `once` (one-shot — refill projection ignores it)

    Returns 0.0 when no active rate-bearing reminder exists; callers must
    check before dividing.
    """
    rate = 0.0
    for r in reminders:
        if not r.is_active:
            continue
        if r.repeat == ReminderRepeatEnum.DAILY:
            rate += 1.0
        elif r.repeat == ReminderRepeatEnum.WEEKLY:
            mask = r.weekday_mask if r.weekday_mask is not None else 0
            # Legacy lenience (matches reminder_recurrence): an unset mask
            # means "every day of the week", so popcount = 7.
            popcount = bin(mask).count("1") if mask > 0 else 7
            rate += popcount / _DAYS_PER_WEEK
        elif r.repeat == ReminderRepeatEnum.MONTHLY:
            rate += 1.0 / _DAYS_PER_MONTH
        # ONCE intentionally contributes 0 — a one-shot dose can't sustain a
        # refill projection.
    return rate


def _crossed_threshold(
    days_remaining: int,
    last_alerted: int | None,
) -> int | None:
    """Return the threshold to fire now, or None if no new alert is due.

    Picks the **most urgent** (smallest) threshold the user has currently
    crossed AND that the user has NOT already been notified about for this
    supply cycle (`last_alerted` is None or strictly greater).

    Examples (`_ALERT_THRESHOLDS_DAYS = (7, 3, 1, 0)`):
      * `_crossed_threshold(8, None)`   → None  (above all thresholds)
      * `_crossed_threshold(5, None)`   → 7     (5 ≤ 7, no prior alert)
      * `_crossed_threshold(5, 7)`      → None  (already alerted at 7)
      * `_crossed_threshold(2, 7)`      → 3     (crossed 3-day mark)
      * `_crossed_threshold(0, 3)`      → 0     (crossed 0-day mark)
      * `_crossed_threshold(-1, 0)`     → None  (already alerted at 0)
    """
    # Walk thresholds from most urgent (0) up; the lowest threshold the user
    # has crossed AND not been notified about wins.
    for threshold in sorted(_ALERT_THRESHOLDS_DAYS):
        if days_remaining <= threshold:
            if last_alerted is None or last_alerted > threshold:
                return threshold
    return None


def _already_notified_review_today(
    db,
    user_id,
    plan_id,
    today_date: datetime.date,
) -> bool:
    """Per-day dedupe for review notifications. (Refill uses the persistent
    `last_refill_alert_threshold` instead — far stronger than per-day.)
    """
    stmt = (
        select(func.count(Notification.id))
        .where(
            Notification.user_id == user_id,
            Notification.kind == NotificationKindEnum.REMINDER.value,
            Notification.reference_id == plan_id,
            cast(Notification.created_at, Date) == today_date,
            Notification.title.like("Review%"),
        )
    )
    return int(db.execute(stmt).scalar_one() or 0) > 0


def _safe_link(plan_id: uuid.UUID) -> str | None:
    """Apply the same allowlist check `notifications.enqueue` enforces.

    `_validate_link` returns None for anything outside the allowlist; we
    short-circuit and persist the notification with `link=NULL` rather than
    a junk path, so the FE renders the notification but no deep link.
    """
    return _validate_link(f"/dashboard/medications/{plan_id}")


def _enqueue_with_audit(
    db,
    *,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    title: str,
    body: str,
    audit_event: AuditEventTypeEnum,
    audit_details: dict,
    audit_created_at: datetime.datetime,
) -> None:
    """Insert one Notification + matching AuditLog row.

    No IP/UA on the audit row — this is a system-fired event from the daily
    beat, not a user request.
    """
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            body=body,
            kind=NotificationKindEnum.REMINDER.value,
            reference_id=plan_id,
            link=_safe_link(plan_id),
        )
    )
    db.add(
        AuditLog(
            user_id=user_id,
            event_type=audit_event,
            details=audit_details,
            created_at=audit_created_at,
        )
    )


@celery_app.task(name="app.tasks.medications.compute_medication_signals")
def compute_medication_signals() -> dict:
    """Daily sweep — emits refill-due + review-due notifications.

    Returns counts for log inspection.
    """
    today = datetime.date.today()
    fired_refill = 0
    fired_review = 0
    plans_seen = 0
    audit_sequence = 0

    def next_audit_created_at() -> datetime.datetime:
        nonlocal audit_sequence
        audit_sequence += 1
        return datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            microseconds=audit_sequence,
        )

    with get_sync_db_context() as db:
        plans = db.execute(
            select(MedicationPlan).where(MedicationPlan.status == "active")
        ).scalars().all()
        for plan in plans:
            plans_seen += 1

            # ── Refill check (persistent crossing-detection) ───────────────
            if plan.refill_supply_units and plan.refill_supply_units > 0:
                rems = db.execute(
                    select(Reminder).where(Reminder.medication_plan_id == plan.id)
                ).scalars().all()
                rate = _doses_per_day(rems)
                if rate <= 0:
                    # No rate-bearing reminders (all `once` or all paused) —
                    # cannot project supply. Skip refill check entirely.
                    pass
                else:
                    # `rate` is a float (amortized weekly/monthly), so float
                    # division then truncate. supply=14 doses, rate=2/7 → 49d.
                    days_remaining = int(plan.refill_supply_units / rate)
                    fire_at = _crossed_threshold(
                        days_remaining, plan.last_refill_alert_threshold
                    )
                    if fire_at is not None:
                        title = (
                            "Refill due soon" if fire_at > 0 else "Refill overdue"
                        )
                        body = (
                            f"{plan.name}: about {days_remaining} day(s) of supply remaining."
                            if fire_at > 0
                            else f"{plan.name}: supply exhausted. Refill before your next dose."
                        )
                        _enqueue_with_audit(
                            db,
                            user_id=plan.user_id,
                            plan_id=plan.id,
                            title=title,
                            body=body,
                            audit_event=AuditEventTypeEnum.MEDICATION_REFILL_LOGGED,
                            audit_details={
                                "plan_id": str(plan.id),
                                "auto": True,
                                "threshold": fire_at,
                                "days_remaining": days_remaining,
                            },
                            audit_created_at=next_audit_created_at(),
                        )
                        plan.last_refill_alert_threshold = fire_at
                        fired_refill += 1

            # ── Review check (per-day dedupe) ──────────────────────────────
            if plan.review_due_at:
                lead = (plan.review_due_at - today).days
                if 0 <= lead <= _REVIEW_LEAD_DAYS:
                    if not _already_notified_review_today(
                        db, plan.user_id, plan.id, today
                    ):
                        _enqueue_with_audit(
                            db,
                            user_id=plan.user_id,
                            plan_id=plan.id,
                            title="Review due soon",
                            body=(
                                f"It's almost time to review {plan.name} with your doctor "
                                f"(due {plan.review_due_at.isoformat()})."
                            ),
                            audit_event=AuditEventTypeEnum.MEDICATION_PLAN_UPDATED,
                            audit_details={
                                "plan_id": str(plan.id),
                                "auto": True,
                                "review_due_at": plan.review_due_at.isoformat(),
                                "lead_days": lead,
                            },
                            audit_created_at=next_audit_created_at(),
                        )
                        fired_review += 1

    return {
        "plans_seen": plans_seen,
        "refill_notifications": fired_refill,
        "review_notifications": fired_review,
    }


@celery_app.task(name="app.tasks.medications.resume_expired_medication_pauses")
def resume_expired_medication_pauses() -> dict:
    """Reactivate plans whose timed pause has expired.

    Child reminders are re-enabled here. The reminder materializer then tops up
    future occurrence rows on its normal 5-minute cadence.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    plans_resumed = 0
    reminders_reactivated = 0
    occurrences_restored = 0

    with get_sync_db_context() as db:
        plans = db.execute(
            select(MedicationPlan).where(
                MedicationPlan.status == "paused",
                MedicationPlan.pause_until.is_not(None),
                MedicationPlan.pause_until <= now,
            ).with_for_update(skip_locked=True)
        ).scalars().all()

        for plan in plans:
            if plan.status != "paused" or plan.pause_until is None or plan.pause_until > now:
                continue
            plan.status = "active"
            plan.pause_until = None
            plan.pause_reason = None
            plans_resumed += 1

            reminders = db.execute(
                select(Reminder).where(Reminder.medication_plan_id == plan.id)
                .with_for_update()
            ).scalars().all()
            rem_ids = [reminder.id for reminder in reminders]
            for reminder in reminders:
                if not reminder.is_active:
                    reminders_reactivated += 1
                reminder.is_active = True
            if rem_ids:
                restored = db.execute(
                    update(ReminderOccurrence)
                    .where(
                        ReminderOccurrence.reminder_id.in_(rem_ids),
                        ReminderOccurrence.status == ReminderOccurrenceStatusEnum.CANCELLED.value,
                        ReminderOccurrence.scheduled_at >= now,
                    )
                    .values(
                        status=ReminderOccurrenceStatusEnum.PENDING.value,
                        skipped_at=None,
                        snoozed_until=None,
                    )
                )
                occurrences_restored += int(restored.rowcount or 0)
                db.flush()
                for reminder in reminders:
                    reminder.next_occurrence_at = db.execute(
                        select(func.min(ReminderOccurrence.scheduled_at)).where(
                            ReminderOccurrence.reminder_id == reminder.id,
                            ReminderOccurrence.scheduled_at >= now,
                            ReminderOccurrence.status == ReminderOccurrenceStatusEnum.PENDING.value,
                        )
                    ).scalar_one()

    return {
        "plans_resumed": plans_resumed,
        "reminders_reactivated": reminders_reactivated,
        "occurrences_restored": occurrences_restored,
    }
