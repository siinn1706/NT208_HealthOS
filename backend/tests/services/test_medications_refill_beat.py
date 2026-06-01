"""Tests for `app.tasks.medications.compute_medication_signals`.

Covers the high-priority review gaps:
  * Threshold crossing (review H6) — supply that jumps past a bucket still
    fires the appropriate alert; subsequent runs at the same supply do not
    re-fire.
  * `last_refill_alert_threshold` is reset by `log_refill` so a new supply
    cycle starts fresh.
  * Review (`review_due_at`) branch fires within the lead window and dedupes
    same-day.
  * Auto-fired notifications are accompanied by an AuditLog row.
  * Notification.link survives the allowlist check.

Each test creates a temporary user and cascade-deletes it on teardown so
the dev DB stays clean.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select

from app.adapters.database import AsyncSessionLocal, engine
# Force mapper init for User.health_goal relationship.
from app.models import health_goal  # noqa: F401
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import (
    MedicationPlan,
    Notification,
    NotificationKindEnum,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    User,
)
from app.schemas.medications import (
    MedicationPlanCreateBody,
    MedicationRefillBody,
)
from app.services import medications as med_svc
from app.tasks.medications import (
    compute_medication_signals,
    resume_expired_medication_pauses,
)

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def temp_user():
    async with AsyncSessionLocal() as db:
        u = User(
            email=f"refill-{uuid.uuid4().hex[:8]}@local",
            username=f"refill_{uuid.uuid4().hex[:8]}",
            display_name="refill smoke",
            hashed_password="x",
        )
        db.add(u)
        await db.commit()
        user_id = u.id
    try:
        yield user_id
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
        await engine.dispose()


async def _refill_notif_count(user_id: uuid.UUID, plan_id: uuid.UUID) -> int:
    async with AsyncSessionLocal() as db:
        return int(
            (
                await db.execute(
                    select(func.count(Notification.id)).where(
                        Notification.user_id == user_id,
                        Notification.kind == NotificationKindEnum.REMINDER.value,
                        Notification.reference_id == plan_id,
                        Notification.title.like("Refill%"),
                    )
                )
            ).scalar_one()
            or 0
        )


async def _audit_count_for(
    user_id: uuid.UUID, event: AuditEventTypeEnum, plan_id: uuid.UUID
) -> int:
    """Count auto-fired audits for a plan.

    Filters on `user_id` only at the SQL layer because asyncpg's per-connection
    enum cache may not know about newly-added enum members (depends on
    when the connection was opened relative to the migration). We do the
    enum-equality + plan-id check in Python instead — fewer than ~10 rows
    per test, cheap to filter client-side.
    """
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(AuditLog).where(AuditLog.user_id == user_id)
            )
        ).scalars().all()
    return sum(
        1
        for r in rows
        if r.event_type == event
        and isinstance(r.details, dict)
        and r.details.get("plan_id") == str(plan_id)
        and r.details.get("auto") is True
    )


async def _last_threshold(plan_id: uuid.UUID) -> int | None:
    async with AsyncSessionLocal() as db:
        plan = (
            await db.execute(select(MedicationPlan).where(MedicationPlan.id == plan_id))
        ).scalar_one_or_none()
        return plan.last_refill_alert_threshold if plan else None


async def test_refill_threshold_crossing_8_to_5_to_2(temp_user):
    """Supply that jumps past 7 still fires; subsequent runs don't dupe;
    further crossings (5 → 2 across the 3-day mark) fire a fresh alert."""
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Crossing Test", dose_times=["08:00"], repeat="daily",
                refill_supply_units=8,
            ),
        )
        await db.commit()

    # 8 days of supply → above all thresholds, no alert.
    res1 = compute_medication_signals()
    assert res1["refill_notifications"] == 0
    assert await _refill_notif_count(user_id, plan.id) == 0
    assert await _last_threshold(plan.id) is None

    # Drop supply to 5 (review H6 — 5 ∉ {7,3,1,0} but the user is below the
    # 7-day threshold so it should fire).
    async with AsyncSessionLocal() as db:
        await med_svc.log_refill(
            db, user_id, plan.id, MedicationRefillBody(supply_units=5)
        )
        await db.commit()
    res2 = compute_medication_signals()
    assert res2["refill_notifications"] == 1, "5 days remaining must fire 7-day alert"
    assert await _refill_notif_count(user_id, plan.id) == 1
    assert await _last_threshold(plan.id) == 7

    # Re-run at supply=5 should NOT duplicate.
    res3 = compute_medication_signals()
    assert res3["refill_notifications"] == 0
    assert await _refill_notif_count(user_id, plan.id) == 1

    # Drop to 2 (crosses the 3-day mark).
    async with AsyncSessionLocal() as db:
        await med_svc.log_refill(
            db, user_id, plan.id, MedicationRefillBody(supply_units=2)
        )
        await db.commit()
    # log_refill resets last_refill_alert_threshold — so this is now a NEW
    # supply cycle, and the beat should fire the most-urgent threshold (3).
    res4 = compute_medication_signals()
    assert res4["refill_notifications"] == 1
    assert await _refill_notif_count(user_id, plan.id) == 2
    assert await _last_threshold(plan.id) == 3


async def test_refill_audit_log_recorded(temp_user):
    """Every auto-fired refill notification gets a matching AuditLog entry
    (review M14 + P2-audit-auto-notif)."""
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Audit Test", dose_times=["08:00"], repeat="daily",
                refill_supply_units=3,  # already at the 3-day threshold
            ),
        )
        await db.commit()

    res = compute_medication_signals()
    assert res["refill_notifications"] == 1
    assert (
        await _audit_count_for(
            user_id, AuditEventTypeEnum.MEDICATION_REFILL_LOGGED, plan.id
        )
        == 1
    )


async def test_refill_notification_link_starts_with_dashboard(temp_user):
    """Auto-fired notifications must survive the link allowlist
    (review M13 + P2-audit-auto-notif). The literal `/dashboard/medications/{id}`
    path passes; this guards against future link-format edits silently
    breaking the contract."""
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Link Test", dose_times=["08:00"], repeat="daily",
                refill_supply_units=1,  # 0-day or 1-day, definitely fires
            ),
        )
        await db.commit()

    compute_medication_signals()
    async with AsyncSessionLocal() as db:
        notif = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.reference_id == plan.id,
                )
            )
        ).scalar_one()
    assert notif.link is not None
    assert notif.link.startswith("/dashboard/medications/")


async def test_refill_skipped_when_no_rate_bearing_reminder(temp_user):
    """A plan whose only reminders are `once` has rate=0; refill projection
    is skipped (review H7 — `_doses_per_day` returns 0.0)."""
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="One-Shot", dose_times=["08:00"], repeat="once",
                refill_supply_units=2,
            ),
        )
        await db.commit()

    res = compute_medication_signals()
    assert res["refill_notifications"] == 0
    assert await _refill_notif_count(user_id, plan.id) == 0


async def test_refill_paused_plan_skipped(temp_user):
    """Paused plans must not trigger refill alerts (the daily beat filters
    `status == 'active'` — see `tasks/medications.py` line 173)."""
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Paused", dose_times=["08:00"], repeat="daily",
                refill_supply_units=2,
            ),
        )
        await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()

    res = compute_medication_signals()
    assert res["refill_notifications"] == 0
    assert await _refill_notif_count(user_id, plan.id) == 0


async def test_expired_timed_pause_reactivates_plan_and_reminders(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Timed Pause", dose_times=["08:00"], repeat="daily",
            ),
        )
        await med_svc.pause_plan(
            db,
            user_id,
            plan.id,
            pause_until=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
            pause_reason="travel",
            update_pause_metadata=True,
        )
        row = await db.get(MedicationPlan, plan.id)
        assert row is not None
        row.pause_until = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
        await db.commit()

    res = resume_expired_medication_pauses()
    assert res["plans_resumed"] == 1
    assert res["reminders_reactivated"] == 1
    assert res["occurrences_restored"] > 0

    async with AsyncSessionLocal() as db:
        row = await db.get(MedicationPlan, plan.id)
        assert row is not None
        assert row.status == "active"
        assert row.pause_until is None
        assert row.pause_reason is None
        reminders = (
            await db.execute(select(Reminder).where(Reminder.medication_plan_id == plan.id))
        ).scalars().all()
        assert reminders
        assert all(reminder.is_active for reminder in reminders)
        assert all(reminder.next_occurrence_at is not None for reminder in reminders)
        pending_future = (
            await db.execute(
                select(ReminderOccurrence).where(
                    ReminderOccurrence.reminder_id.in_([reminder.id for reminder in reminders]),
                    ReminderOccurrence.status == ReminderOccurrenceStatusEnum.PENDING.value,
                    ReminderOccurrence.scheduled_at >= datetime.datetime.now(datetime.timezone.utc),
                )
            )
        ).scalars().all()
        assert pending_future


async def test_future_timed_pause_is_not_resumed(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Future Timed Pause", dose_times=["08:00"], repeat="daily",
            ),
        )
        pause_until = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
        await med_svc.pause_plan(
            db,
            user_id,
            plan.id,
            pause_until=pause_until,
            update_pause_metadata=True,
        )
        await db.commit()

    res = resume_expired_medication_pauses()
    assert res["plans_resumed"] == 0

    async with AsyncSessionLocal() as db:
        row = await db.get(MedicationPlan, plan.id)
        assert row is not None
        assert row.status == "paused"
        assert row.pause_until is not None


async def test_review_within_lead_window_fires(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Review Test",
                dose_times=["08:00"],
                repeat="daily",
                review_due_at=datetime.date.today() + datetime.timedelta(days=3),
            ),
        )
        await db.commit()

    res = compute_medication_signals()
    assert res["review_notifications"] == 1

    # Same day re-run must not duplicate.
    res2 = compute_medication_signals()
    assert res2["review_notifications"] == 0


async def test_review_outside_lead_window_does_not_fire(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Far Review",
                dose_times=["08:00"],
                repeat="daily",
                review_due_at=datetime.date.today() + datetime.timedelta(days=30),
            ),
        )
        await db.commit()

    res = compute_medication_signals()
    assert res["review_notifications"] == 0
