"""Integration test for the medication-plan lifecycle against the live dev DB.

Covers the create → today doses → pause → cancelled-occurrences → resume →
adherence → log-refill → archive flow with assertions on every state
transition. These tests need a real PostgreSQL connection (the
`reminders` / `reminder_occurrences` materialization is exercised end-to-end
through the existing reminder service).

Run only when a Postgres DB at `settings.database_url` is reachable.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
# Force mapper configuration for User.health_goal relationship.
from app.models import health_goal  # noqa: F401
from app.models.core import (
    MedicationPlan,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    User,
)
from app.schemas.medications import (
    MedicationPlanCreateBody,
    MedicationPlanUpdateBody,
    MedicationRefillBody,
)
from app.services import medications as med_svc


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def temp_user():
    """Create a throwaway user, hand it to the test, then cascade-delete it."""
    async with AsyncSessionLocal() as db:
        u = User(
            email=f"med-{uuid.uuid4().hex[:8]}@local",
            username=f"med_{uuid.uuid4().hex[:8]}",
            display_name="lifecycle",
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


async def _count_pending(db, plan_id) -> int:
    rems = (
        await db.execute(
            select(Reminder.id).where(Reminder.medication_plan_id == plan_id)
        )
    ).scalars().all()
    if not rems:
        return 0
    return int(
        (
            await db.execute(
                select(ReminderOccurrence)
                .where(
                    ReminderOccurrence.reminder_id.in_(rems),
                    ReminderOccurrence.status == ReminderOccurrenceStatusEnum.PENDING.value,
                )
            )
        ).scalars().all().__len__()
    )


async def test_full_plan_lifecycle(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        # Create with two dose times → two child reminders + initial occurrences.
        plan = await med_svc.create_plan(
            db,
            user_id,
            MedicationPlanCreateBody(
                name="Lifecycle Med",
                strength="500 mg",
                form="tablet",
                instructions="Take with food",
                dose_times=["08:00", "20:00"],
                repeat="daily",
                refill_supply_units=14,
            ),
        )
        await db.commit()
        assert plan.dose_count == 2
        assert plan.status == "active"
        assert plan.refill_supply_units == 14

        # Pause flips child reminders + cancels pending occurrences.
        paused = await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()
        assert paused is not None and paused.status == "paused"
        async with AsyncSessionLocal() as fresh:
            pending = await _count_pending(fresh, plan.id)
        assert pending == 0, "pause must bulk-cancel pending occurrences"

        # Resume re-activates and re-materialises.
        resumed = await med_svc.resume_plan(db, user_id, plan.id)
        await db.commit()
        assert resumed is not None and resumed.status == "active"
        async with AsyncSessionLocal() as fresh:
            pending_after_resume = await _count_pending(fresh, plan.id)
        assert pending_after_resume > 0, "resume must restore future dose occurrences"

        # Update schedule (rebuild reminders) — drop to 1 dose/day.
        updated = await med_svc.update_plan(
            db, user_id, plan.id,
            MedicationPlanUpdateBody(dose_times=["09:00"]),
        )
        await db.commit()
        assert updated is not None and updated.dose_count == 1

        # Log refill — supply changes + projection is computed.
        refilled = await med_svc.log_refill(
            db, user_id, plan.id, MedicationRefillBody(supply_units=30),
        )
        await db.commit()
        assert refilled is not None
        assert refilled.refill_supply_units == 30
        assert refilled.next_refill_estimated_at is not None

        # Adherence over 7d should compute (no doses logged → 0%, but the
        # response shape is what we assert here).
        adh = await med_svc.compute_adherence(db, user_id, plan.id, period="7d")
        assert adh is not None
        assert adh.period_days == 7
        assert adh.percent in range(0, 101)

        # Archive — child reminders deactivate, status flips to cancelled.
        ok = await med_svc.archive_plan(db, user_id, plan.id)
        await db.commit()
        assert ok is True
        archived = await med_svc.get_plan(db, user_id, plan.id)
        assert archived is not None and archived.status == "cancelled"


async def test_pause_is_idempotent(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(name="X", dose_times=["08:00"], repeat="daily"),
        )
        await db.commit()

        first = await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()
        second = await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()
        assert first is not None and first.status == "paused"
        assert second is not None and second.status == "paused"


async def test_pause_metadata_persists_and_resume_clears(temp_user):
    user_id = temp_user
    pause_until = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3)
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(name="Procedure Hold", dose_times=["08:00"]),
        )
        await db.commit()

        paused = await med_svc.pause_plan(
            db,
            user_id,
            plan.id,
            pause_until=pause_until,
            pause_reason="  upcoming procedure  ",
            update_pause_metadata=True,
        )
        await db.commit()
        assert paused is not None
        assert paused.status == "paused"
        assert paused.pause_until is not None
        assert paused.pause_reason == "upcoming procedure"

        resumed = await med_svc.resume_plan(db, user_id, plan.id)
        await db.commit()
        assert resumed is not None
        assert resumed.status == "active"
        assert resumed.pause_until is None
        assert resumed.pause_reason is None
        async with AsyncSessionLocal() as fresh:
            assert await _count_pending(fresh, plan.id) > 0


async def test_pause_rejects_past_pause_until(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(name="Past Hold", dose_times=["08:00"]),
        )
        await db.commit()

        with pytest.raises(ValueError, match="future"):
            await med_svc.pause_plan(
                db,
                user_id,
                plan.id,
                pause_until=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1),
                update_pause_metadata=True,
            )


async def test_cross_user_get_returns_none(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(name="Owned", dose_times=["08:00"]),
        )
        await db.commit()

        # A different user trying to read this plan must miss.
        other = uuid.uuid4()
        assert await med_svc.get_plan(db, other, plan.id) is None
        assert await med_svc.get_plan_detail(db, other, plan.id) is None
        assert (
            await med_svc.compute_adherence(db, other, plan.id, period="7d")
        ) is None
        assert (
            await med_svc.pause_plan(db, other, plan.id)
        ) is None
        assert (
            await med_svc.archive_plan(db, other, plan.id)
        ) is False


async def test_marking_dose_done_reflects_in_adherence(temp_user):
    """Review H8 / P1-test-reuse: prove the reuse story.

    A plan-owned `Reminder` fires through the EXISTING reminder occurrence
    pipeline. When the user marks an occurrence done via the reminder
    service (what `POST /v1/reminders/{id}/done` does at the endpoint),
    the medication adherence aggregation must reflect it. This is the
    integration the entire architecture relies on.
    """
    from app.services import reminders as reminder_svc

    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Reuse Test",
                dose_times=["08:00"],
                repeat="daily",
            ),
        )
        # Find the child reminder + its initial occurrence(s).
        rem_rows = (
            await db.execute(
                select(Reminder).where(Reminder.medication_plan_id == plan.id)
            )
        ).scalars().all()
        assert len(rem_rows) == 1
        reminder = rem_rows[0]

        # An initial occurrence was materialized at create time.
        occ = (
            await db.execute(
                select(ReminderOccurrence).where(
                    ReminderOccurrence.reminder_id == reminder.id
                )
            )
        ).scalars().first()
        assert occ is not None
        # Force the occurrence into the past so adherence's
        # `scheduled_at < now` window includes it.
        occ.scheduled_at = datetime.datetime.now(
            datetime.timezone.utc
        ) - datetime.timedelta(hours=2)
        await db.flush()
        await db.commit()

    # Mark it done through the SAME service the endpoint uses.
    async with AsyncSessionLocal() as db:
        marked = await reminder_svc.mark_done_occurrence(
            db, user_id, reminder.id, occurrence_id=occ.id,
        )
        assert marked is not None
        assert marked.status == ReminderOccurrenceStatusEnum.DONE.value
        await db.commit()

    # Adherence over 7 days must now include exactly one taken dose.
    async with AsyncSessionLocal() as db:
        adh = await med_svc.compute_adherence(
            db, user_id, plan.id, period="7d",
        )
    assert adh is not None
    assert adh.taken == 1, f"expected 1 taken dose, got {adh.taken}"
    assert adh.scheduled >= 1
    assert adh.percent > 0


async def test_pause_does_not_depress_adherence(temp_user):
    """Review M5 — system-cancelled occurrences (from pause) are excluded
    from the adherence denominator. A user pausing for a flu must not see
    their percent drop just because we hid future doses."""
    from app.services import reminders as reminder_svc

    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Pause Adherence Test",
                dose_times=["08:00"],
                repeat="daily",
            ),
        )
        # Get the child reminder + pull one occurrence into the past and mark
        # it done so we have a non-zero baseline.
        rems = (
            await db.execute(
                select(Reminder).where(Reminder.medication_plan_id == plan.id)
            )
        ).scalars().all()
        reminder = rems[0]
        first_occ = (
            await db.execute(
                select(ReminderOccurrence).where(
                    ReminderOccurrence.reminder_id == reminder.id
                )
            )
        ).scalars().first()
        first_occ.scheduled_at = datetime.datetime.now(
            datetime.timezone.utc
        ) - datetime.timedelta(hours=2)
        await db.flush()
        await db.commit()

    async with AsyncSessionLocal() as db:
        await reminder_svc.mark_done_occurrence(
            db, user_id, reminder.id, occurrence_id=first_occ.id,
        )
        await db.commit()

    # Sanity check: 100% before pause.
    async with AsyncSessionLocal() as db:
        adh = await med_svc.compute_adherence(db, user_id, plan.id, period="7d")
    assert adh is not None and adh.percent == 100, (
        f"baseline expected 100%, got {adh and adh.percent}%"
    )

    # Inject a future-pending occurrence, pull it into the past so it lands
    # in the adherence window, then pause — the bulk-cancel will mark it
    # CANCELLED (not SKIPPED), and adherence should still read 100%.
    async with AsyncSessionLocal() as db:
        injected = ReminderOccurrence(
            reminder_id=reminder.id,
            scheduled_at=datetime.datetime.now(
                datetime.timezone.utc
            ) - datetime.timedelta(hours=1),
            status=ReminderOccurrenceStatusEnum.PENDING.value,
        )
        db.add(injected)
        await db.flush()
        # Pause the plan — this must flip the injected pending row to CANCELLED.
        await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()

    # Adherence still 100% — the cancelled row is excluded from both
    # numerator and denominator, NOT counted as a skip.
    async with AsyncSessionLocal() as db:
        adh_after = await med_svc.compute_adherence(
            db, user_id, plan.id, period="7d",
        )
    assert adh_after is not None
    assert adh_after.percent == 100, (
        f"pause must not depress adherence (M5 fix), got {adh_after.percent}%"
    )
    assert adh_after.skipped == 0, (
        f"cancelled rows must NOT count as skipped, got skipped={adh_after.skipped}"
    )


async def test_pause_then_materialize_produces_no_new_occurrences(temp_user):
    """Review H5 / P1: pausing a plan must stop the materializer from
    creating fresh occurrences for its child reminders. This guards the
    pause story even if `fire_due_occurrences` were to misbehave.
    """
    from app.services import reminders as reminder_svc

    user_id = temp_user
    async with AsyncSessionLocal() as db:
        plan = await med_svc.create_plan(
            db, user_id,
            MedicationPlanCreateBody(
                name="Pause Materialize Test",
                dose_times=["08:00"],
                repeat="daily",
            ),
        )
        await db.commit()

    # Pause the plan — `is_active` flips to False on each child reminder.
    async with AsyncSessionLocal() as db:
        await med_svc.pause_plan(db, user_id, plan.id)
        await db.commit()

    # Re-running `materialize_for_reminder` for a paused reminder must be
    # a no-op (returns 0). This is the contract the daily beat relies on.
    async with AsyncSessionLocal() as db:
        rems = (
            await db.execute(
                select(Reminder).where(Reminder.medication_plan_id == plan.id)
            )
        ).scalars().all()
        for r in rems:
            inserted = await reminder_svc.materialize_for_reminder(db, r)
            assert inserted == 0, (
                f"materializer must not insert occurrences for paused plans, "
                f"got {inserted}"
            )


async def test_import_idempotent_and_skips_missing_name(temp_user):
    user_id = temp_user
    async with AsyncSessionLocal() as db:
        # Build an appointment with one valid + one invalid medicine.
        from app.models.core import Appointment, AppointmentStatusEnum
        appt = Appointment(
            user_id=user_id,
            appointment_date=datetime.datetime.now(datetime.timezone.utc),
            doctor_name="Dr. Import",
            specialty="X",
            clinic="Y",
            status=AppointmentStatusEnum.COMPLETED,
            prescription={
                "id": "rx",
                "doctor": "Dr. Import",
                "clinic": "Y",
                "diagnosis": "Z",
                "medicines": [
                    {
                        "name": "Metformin",
                        "dosage": "500 mg",
                        "frequency": "twice a day",
                        "duration": "30 days",
                    },
                    {"name": "", "dosage": "", "frequency": "", "duration": ""},
                ],
            },
        )
        db.add(appt)
        await db.commit()

        from app.schemas.medications import MedicationImportBody
        first = await med_svc.import_from_appointment(
            db, user_id, appt.id, MedicationImportBody()
        )
        await db.commit()
        assert first is not None
        assert len(first.created) == 1
        assert any(s.reason == "missing name" for s in first.skipped)

        # Re-run — must be idempotent.
        second = await med_svc.import_from_appointment(
            db, user_id, appt.id, MedicationImportBody()
        )
        await db.commit()
        assert second is not None
        assert len(second.created) == 0
        assert any(s.reason == "already imported" for s in second.skipped)
