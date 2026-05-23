"""Medication Hub service.

Wraps the existing reminder service to keep a single firing pipeline. The
`MedicationPlan` is the user-facing entity; child `Reminder` rows (one per
dose-time-of-day) are an implementation detail.

Public surface:
  * `list_plans` / `get_plan` / `get_plan_detail`
  * `create_plan` (atomic: plan + N child reminders + initial occurrences)
  * `update_plan_metadata` / `update_plan_schedule` (schedule rebuilds children)
  * `pause_plan` / `resume_plan` (flip child reminder is_active + cancel
    pending occurrences atomically)
  * `archive_plan` (soft delete — status=cancelled, deactivate children, keep
    occurrence history for adherence)
  * `today_doses` (server-driven panel)
  * `compute_adherence` (single-query SQL aggregation over reminder_occurrences)
  * `log_refill` (records refill, refreshes next_refill_estimated_at)
  * `import_from_appointment` (idempotent via dedupe_key)

ALL operations are user-scoped via explicit `user_id` checks; the service
never relies on the caller having pre-validated ownership.
"""
from __future__ import annotations

import datetime
import hashlib
import logging
import re
import uuid
from typing import Iterable, Optional

from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    Appointment,
    MedicationPlan,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    ReminderRepeatEnum,
    ReminderTypeEnum,
)
from app.schemas.medications import (
    AdherenceDTO,
    MedicationDoseDTO,
    MedicationDoseSummary,
    MedicationImportBody,
    MedicationImportResult,
    MedicationImportSkipped,
    MedicationPlanCreateBody,
    MedicationPlanDTO,
    MedicationPlanDetailDTO,
    MedicationPlanUpdateBody,
    MedicationRefillBody,
    _canonicalize_dose_times,
)
from app.schemas.reminders import ReminderCreateBody
from app.services import reminders as reminder_svc
from app.services.reminder_recurrence import DEFAULT_TZID, reminder_today_window

logger = logging.getLogger(__name__)


# Heuristic: lifetime cap of dose reminders the materializer will create per
# day per plan. The recurrence horizon already caps each *reminder* — this is
# a defensive ceiling on plan-level dose count.
MAX_DOSES_PER_PLAN = 8

# Frequency-text → dose count, for `import_from_appointment`. Free-text from
# the prescription JSONB is messy; we intentionally keep the lookup tiny
# and conservative — anything we can't classify falls back to `default`.
#
# IMPORTANT: ordered most-specific first. "twice a day" must match the 2x
# pattern before the 1x pattern's "day" / "daily" tokens. We deliberately
# omit "day" from the 1x bucket because it appears in every multi-dose
# phrase ("twice a day" / "3 times a day" / "every other day").
_FREQUENCY_HINTS: tuple[tuple[re.Pattern[str], int], ...] = (
    (re.compile(r"\b(4\s*x|qid|q\.i\.d|4\s*times)\b", re.I), 4),
    (re.compile(r"\b(thrice|3\s*x|tid|t\.i\.d|3\s*times)\b", re.I), 3),
    (re.compile(r"\b(twice|2\s*x|bid|b\.i\.d|2\s*times)\b", re.I), 2),
    (re.compile(r"\b(once|1\s*x|q\.?d|qd|daily)\b", re.I), 1),
)


def _spread_default_times(n: int) -> list[str]:
    """Distribute N daily doses across waking hours (07:00–22:00).
    1 → 08:00, 2 → 08:00/20:00, 3 → 08:00/14:00/20:00, 4 → 07:00/13:00/19:00/22:00.
    """
    presets = {
        1: ["08:00"],
        2: ["08:00", "20:00"],
        3: ["08:00", "14:00", "20:00"],
        4: ["07:00", "13:00", "19:00", "22:00"],
    }
    return presets.get(n, ["08:00"])


def _infer_doses_per_day(frequency_text: Optional[str]) -> int:
    if not frequency_text:
        return 1
    for pat, n in _FREQUENCY_HINTS:
        if pat.search(frequency_text):
            return n
    return 1


def _make_dedupe_key(appointment_id: uuid.UUID, idx: int, name: str) -> str:
    raw = f"{appointment_id}:{idx}:{name.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# DTO conversion
# ─────────────────────────────────────────────────────────────────────────────


_DAYS_PER_WEEK = 7.0
_DAYS_PER_MONTH = 30.0


def _doses_per_day_for_plan(reminders: Iterable[Reminder]) -> float:
    """Daily dose rate, **amortized** for weekly / monthly schedules.

    Each active child reminder contributes:
      * `1.0` for `daily`
      * `popcount(weekday_mask) / 7` for `weekly` (legacy 0-mask = 7/7)
      * `1 / 30` for `monthly`
      * `0.0` for `once` (single-shot — refill projection ignores it)

    Returns 0.0 when nothing rate-bearing is active. Callers handle that case
    explicitly (refill projection skips). Mirrors `app.tasks.medications._doses_per_day`.
    """
    rate = 0.0
    for r in reminders:
        if not r.is_active:
            continue
        if r.repeat == ReminderRepeatEnum.DAILY:
            rate += 1.0
        elif r.repeat == ReminderRepeatEnum.WEEKLY:
            mask = r.weekday_mask if r.weekday_mask is not None else 0
            popcount = bin(mask).count("1") if mask > 0 else 7
            rate += popcount / _DAYS_PER_WEEK
        elif r.repeat == ReminderRepeatEnum.MONTHLY:
            rate += 1.0 / _DAYS_PER_MONTH
        # ONCE deliberately contributes 0.
    return rate


def _next_dose_at(reminders: Iterable[Reminder]) -> Optional[datetime.datetime]:
    candidates = [r.next_occurrence_at for r in reminders if r.next_occurrence_at]
    if not candidates:
        return None
    return min(candidates)


def _to_dto(plan: MedicationPlan, reminders: list[Reminder] | None = None) -> MedicationPlanDTO:
    rems = reminders if reminders is not None else list(plan.reminders or [])
    active = [r for r in rems if r.is_active]
    return MedicationPlanDTO(
        id=plan.id,
        name=plan.name,
        generic_name=plan.generic_name,
        strength=plan.strength,
        form=plan.form,
        instructions=plan.instructions,
        prescriber=plan.prescriber,
        clinic=plan.clinic,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        tzid=plan.tzid,
        refill_supply_units=plan.refill_supply_units,
        refill_cadence_days=plan.refill_cadence_days,
        last_refill_at=plan.last_refill_at,
        next_refill_estimated_at=plan.next_refill_estimated_at,
        review_due_at=plan.review_due_at,
        appointment_id=plan.appointment_id,
        notes=plan.notes,
        dose_count=len(active),
        next_dose_at=_next_dose_at(active),
    )


def _to_dose_summary(rem: Reminder) -> MedicationDoseSummary:
    return MedicationDoseSummary(
        reminder_id=rem.id,
        time=rem.remind_time,
        repeat=rem.repeat.value,
        weekday_mask=rem.weekday_mask,
        day_of_month=rem.day_of_month,
        next_occurrence_at=rem.next_occurrence_at,
        is_active=rem.is_active,
    )


def _to_detail(plan: MedicationPlan, reminders: list[Reminder]) -> MedicationPlanDetailDTO:
    base = _to_dto(plan, reminders)
    return MedicationPlanDetailDTO(
        **base.model_dump(),
        doses=[_to_dose_summary(r) for r in reminders],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _load_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> Optional[MedicationPlan]:
    result = await db.execute(
        select(MedicationPlan).where(
            MedicationPlan.id == plan_id,
            MedicationPlan.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _load_plan_reminders(  # idor-ok: private helper — plan ownership verified by caller before this is invoked
    db: AsyncSession,
    plan_id: uuid.UUID,
) -> list[Reminder]:
    result = await db.execute(
        select(Reminder)
        .where(Reminder.medication_plan_id == plan_id)
        .order_by(Reminder.remind_time.asc(), Reminder.created_at.asc())
    )
    return list(result.scalars().all())


async def _create_dose_reminders(
    db: AsyncSession,
    plan: MedicationPlan,
    *,
    dose_times: list[str],
    repeat: str,
    weekday_mask: Optional[int],
    day_of_month: Optional[int],
) -> list[Reminder]:
    """Spawn child reminders within the same transaction as `plan`.

    Each reminder is created via the existing `reminder_svc.create_reminder`
    helper so the recurrence + initial occurrence materialization all happens
    through the production-tested path. We then back-fill the FK after each
    create to associate the reminder with this plan.
    """
    out: list[Reminder] = []
    for time in dose_times:
        rem = await reminder_svc.create_reminder(
            db,
            plan.user_id,
            ReminderCreateBody(
                type="medicine",
                title=plan.name,
                time=time,
                repeat=repeat,
                tzid=plan.tzid,
                weekday_mask=weekday_mask,
                day_of_month=day_of_month,
                start_date=plan.start_date,
                end_date=plan.end_date,
                note=plan.instructions,
            ),
        )
        # `create_reminder` returned a DTO; re-load the ORM row to mutate the FK.
        orm_row = (
            await db.execute(select(Reminder).where(Reminder.id == rem.id))
        ).scalar_one()
        orm_row.medication_plan_id = plan.id
        out.append(orm_row)
    await db.flush()
    return out


async def _cancel_pending_occurrences_for_reminders(
    db: AsyncSession,
    reminder_ids: list[uuid.UUID],
) -> int:
    """When pausing/archiving a plan: cancel any pending/snoozed occurrences
    so the firing tick doesn't deliver a notification for a med the user
    explicitly stopped.

    Uses the `CANCELLED` status (review M5) instead of `SKIPPED` so the
    adherence aggregator can distinguish system-cancellation from
    user-skipping — pausing for a flu must not depress the user's adherence
    percent, but skipping a dose because they forgot to bring meds to work
    must.
    """
    if not reminder_ids:
        return 0
    now = datetime.datetime.now(datetime.timezone.utc)
    res = await db.execute(
        update(ReminderOccurrence)
        .where(
            ReminderOccurrence.reminder_id.in_(reminder_ids),
            ReminderOccurrence.status.in_(
                [
                    ReminderOccurrenceStatusEnum.PENDING.value,
                    ReminderOccurrenceStatusEnum.SNOOZED.value,
                ]
            ),
        )
        .values(
            status=ReminderOccurrenceStatusEnum.CANCELLED.value,
            # Reuse `skipped_at` as the "stopped at" timestamp — keeps the
            # schema additive. The status is the source of truth for intent.
            skipped_at=now,
        )
    )
    return int(res.rowcount or 0)


async def _refresh_refill_projection(
    db: AsyncSession,
    plan: MedicationPlan,
) -> None:
    """Recompute `next_refill_estimated_at` from current supply + dose rate.

    `dpd` is now an **amortized** float rate (review H7) so weekly /
    monthly meds with low frequency get realistic projections (e.g.,
    14 doses on a Mon+Thu schedule lasts ≈ 49 days, not 7).

    Estimated date = `last_refill_at` (or now) + `days_remaining`. Capped at
    NULL when the rate is zero (only `once` reminders) or supply is empty.
    """
    if plan.refill_supply_units is None or plan.refill_supply_units <= 0:
        plan.next_refill_estimated_at = None
        return
    rems = await _load_plan_reminders(db, plan.id)
    rate = _doses_per_day_for_plan(rems)
    if rate <= 0:
        plan.next_refill_estimated_at = None
        return
    days_remaining = max(0, int(plan.refill_supply_units / rate))
    base = plan.last_refill_at or datetime.datetime.now(datetime.timezone.utc)
    plan.next_refill_estimated_at = base + datetime.timedelta(days=days_remaining)


# ─────────────────────────────────────────────────────────────────────────────
# Public service surface
# ─────────────────────────────────────────────────────────────────────────────


async def list_plans(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    status_filter: Optional[str] = None,
) -> list[MedicationPlanDTO]:
    stmt = select(MedicationPlan).where(MedicationPlan.user_id == user_id)
    if status_filter and status_filter != "all":
        stmt = stmt.where(MedicationPlan.status == status_filter)
    stmt = stmt.order_by(
        # Active plans first, then most-recent.
        (MedicationPlan.status == "active").desc(),
        MedicationPlan.updated_at.desc(),
    )
    rows = (await db.execute(stmt)).scalars().all()

    if not rows:
        return []

    # One follow-up query for child reminders, grouped by plan_id.
    plan_ids = [r.id for r in rows]
    rem_rows = (
        await db.execute(
            select(Reminder).where(Reminder.medication_plan_id.in_(plan_ids))
        )
    ).scalars().all()
    by_plan: dict[uuid.UUID, list[Reminder]] = {pid: [] for pid in plan_ids}
    for rem in rem_rows:
        if rem.medication_plan_id is not None:
            by_plan.setdefault(rem.medication_plan_id, []).append(rem)
    return [_to_dto(p, by_plan.get(p.id, [])) for p in rows]


async def get_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> Optional[MedicationPlanDTO]:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    rems = await _load_plan_reminders(db, plan_id)
    return _to_dto(plan, rems)


async def get_plan_detail(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> Optional[MedicationPlanDetailDTO]:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    rems = await _load_plan_reminders(db, plan_id)
    return _to_detail(plan, rems)


async def create_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    body: MedicationPlanCreateBody,
    *,
    appointment_id: Optional[uuid.UUID] = None,
    dedupe_key: Optional[str] = None,
) -> MedicationPlanDTO:
    """Atomic: insert plan, then create N child reminders.

    The endpoint commits — service only flushes. If any reminder creation
    raises, the surrounding endpoint's session rolls back.
    """
    if len(body.dose_times) > MAX_DOSES_PER_PLAN:
        raise ValueError(f"At most {MAX_DOSES_PER_PLAN} dose times per plan.")
    start_date = body.start_date or datetime.date.today()
    plan = MedicationPlan(
        user_id=user_id,
        appointment_id=appointment_id or body.appointment_id,
        name=body.name,
        generic_name=body.generic_name,
        strength=body.strength,
        form=body.form,
        instructions=body.instructions,
        prescriber=body.prescriber,
        clinic=body.clinic,
        start_date=start_date,
        end_date=body.end_date,
        status="active",
        tzid=body.tzid or DEFAULT_TZID,
        refill_supply_units=body.refill_supply_units,
        refill_cadence_days=body.refill_cadence_days,
        review_due_at=body.review_due_at,
        notes=body.notes,
        dedupe_key=dedupe_key,
    )
    db.add(plan)
    await db.flush()

    rems = await _create_dose_reminders(
        db,
        plan,
        dose_times=body.dose_times,
        repeat=body.repeat,
        weekday_mask=body.weekday_mask,
        day_of_month=body.day_of_month,
    )

    await _refresh_refill_projection(db, plan)
    await db.flush()
    return _to_dto(plan, rems)


async def update_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: MedicationPlanUpdateBody,
) -> Optional[MedicationPlanDTO]:
    """Update metadata; if `dose_times`/`repeat`/`weekday_mask`/`day_of_month`
    is set, replace child reminders.
    """
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None

    schedule_changed = (
        body.dose_times is not None
        or body.repeat is not None
        or body.weekday_mask is not None
        or body.day_of_month is not None
    )

    # Update metadata.
    for field in (
        "name",
        "generic_name",
        "strength",
        "form",
        "instructions",
        "prescriber",
        "clinic",
        "start_date",
        "end_date",
        "tzid",
        "review_due_at",
        "notes",
    ):
        val = getattr(body, field)
        if val is not None:
            setattr(plan, field, val)

    if plan.start_date and plan.end_date and plan.end_date < plan.start_date:
        raise ValueError("end_date must be on or after start_date")

    if schedule_changed:
        existing = await _load_plan_reminders(db, plan_id)
        rem_ids = [r.id for r in existing]
        await _cancel_pending_occurrences_for_reminders(db, rem_ids)
        # Hard-delete the existing reminder rows so the new schedule is clean.
        # CASCADE on `reminder_occurrences` removes finished history too —
        # acceptable trade-off for a schedule rebuild (UI surfaces this).
        if rem_ids:
            await db.execute(delete(Reminder).where(Reminder.id.in_(rem_ids)))
        # Re-create with the new schedule, falling back to existing values
        # for any field the body didn't override.
        existing_times = sorted({r.remind_time for r in existing}) or ["08:00"]
        existing_repeat = (
            existing[0].repeat.value if existing else "daily"
        )
        new_times = body.dose_times or existing_times
        new_repeat = body.repeat or existing_repeat
        new_weekday_mask = (
            body.weekday_mask
            if body.weekday_mask is not None
            else (existing[0].weekday_mask if existing else None)
        )
        new_day_of_month = (
            body.day_of_month
            if body.day_of_month is not None
            else (existing[0].day_of_month if existing else None)
        )
        await _create_dose_reminders(
            db,
            plan,
            dose_times=new_times,
            repeat=new_repeat,
            weekday_mask=new_weekday_mask,
            day_of_month=new_day_of_month,
        )

    await _refresh_refill_projection(db, plan)
    await db.flush()
    rems = await _load_plan_reminders(db, plan_id)
    return _to_dto(plan, rems)


async def pause_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> Optional[MedicationPlanDTO]:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    if plan.status != "active":
        # Idempotent — pausing an already-paused plan is a no-op.
        rems = await _load_plan_reminders(db, plan_id)
        return _to_dto(plan, rems)

    plan.status = "paused"
    rems = await _load_plan_reminders(db, plan_id)
    rem_ids = [r.id for r in rems]
    if rem_ids:
        await db.execute(
            update(Reminder)
            .where(Reminder.id.in_(rem_ids))
            .values(is_active=False, next_occurrence_at=None)
        )
        await _cancel_pending_occurrences_for_reminders(db, rem_ids)
    await db.flush()
    rems_after = await _load_plan_reminders(db, plan_id)
    return _to_dto(plan, rems_after)


async def resume_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> Optional[MedicationPlanDTO]:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    if plan.status not in ("paused", "completed"):
        rems = await _load_plan_reminders(db, plan_id)
        return _to_dto(plan, rems)

    plan.status = "active"
    rems = await _load_plan_reminders(db, plan_id)
    for r in rems:
        r.is_active = True
    await db.flush()
    # Re-materialize occurrence rows for the next horizon.
    for r in rems:
        await reminder_svc.materialize_for_reminder(db, r)
    await db.flush()
    rems_after = await _load_plan_reminders(db, plan_id)
    return _to_dto(plan, rems_after)


async def archive_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> bool:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return False
    plan.status = "cancelled"
    rems = await _load_plan_reminders(db, plan_id)
    rem_ids = [r.id for r in rems]
    if rem_ids:
        await db.execute(
            update(Reminder)
            .where(Reminder.id.in_(rem_ids))
            .values(is_active=False, done=True, next_occurrence_at=None)
        )
        await _cancel_pending_occurrences_for_reminders(db, rem_ids)
    await db.flush()
    return True


async def log_refill(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: MedicationRefillBody,
) -> Optional[MedicationPlanDTO]:
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    plan.refill_supply_units = body.supply_units
    plan.last_refill_at = body.refilled_at or datetime.datetime.now(datetime.timezone.utc)
    # Reset the alert-crossing latch so the new supply cycle re-fires every
    # threshold as it's crossed (review H6 follow-up).
    plan.last_refill_alert_threshold = None
    await _refresh_refill_projection(db, plan)
    await db.flush()
    rems = await _load_plan_reminders(db, plan_id)
    return _to_dto(plan, rems)


# ─────────────────────────────────────────────────────────────────────────────
# Today's-doses panel
# ─────────────────────────────────────────────────────────────────────────────


async def today_doses(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    tzid: str = DEFAULT_TZID,
) -> list[MedicationDoseDTO]:
    """All occurrences scheduled today across the user's **active** plans.

    Paused/completed/cancelled plans are excluded — pausing already cancels
    pending occurrences (`_cancel_pending_occurrences_for_reminders`), so any
    occurrence still in the table for a non-active plan is a `done` row from
    history. Showing those would clutter the "today" panel with completed
    history items the user can no longer act on.
    """
    range_from, range_to = reminder_today_window(tzid)
    rows = (
        await db.execute(
            select(ReminderOccurrence, Reminder, MedicationPlan)
            .join(Reminder, Reminder.id == ReminderOccurrence.reminder_id)
            .join(MedicationPlan, MedicationPlan.id == Reminder.medication_plan_id)
            .where(
                MedicationPlan.user_id == user_id,
                MedicationPlan.status == "active",
                ReminderOccurrence.scheduled_at >= range_from,
                ReminderOccurrence.scheduled_at < range_to,
            )
            .order_by(ReminderOccurrence.scheduled_at.asc())
        )
    ).all()
    return [
        MedicationDoseDTO(
            occurrence_id=occ.id,
            reminder_id=occ.reminder_id,
            medication_plan_id=plan.id,
            plan_name=plan.name,
            strength=plan.strength,
            scheduled_at=occ.scheduled_at,
            status=occ.status,
        )
        for (occ, _rem, plan) in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Adherence (single-query aggregation)
# ─────────────────────────────────────────────────────────────────────────────


def _period_to_days(period: str) -> int:
    mapping = {"7d": 7, "30d": 30, "90d": 90}
    if period not in mapping:
        raise ValueError(f"period must be one of {sorted(mapping)}")
    return mapping[period]


async def compute_adherence(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    *,
    period: str = "7d",
) -> Optional[AdherenceDTO]:
    """Aggregate occurrence statuses for a plan over [now-period, now).

    `cancelled` rows (system-cancellations from pause/archive — review M5)
    are EXCLUDED from both numerator and denominator: the user never had a
    chance to take those doses, so they should not depress the percent.
    User-initiated `skipped` rows are still counted in the denominator.
    """
    plan = await _load_plan(db, user_id, plan_id)
    if plan is None:
        return None
    days = _period_to_days(period)
    now = datetime.datetime.now(datetime.timezone.utc)
    since = now - datetime.timedelta(days=days)

    rows = (
        await db.execute(
            select(ReminderOccurrence.status, func.count())
            .join(Reminder, Reminder.id == ReminderOccurrence.reminder_id)
            .where(
                Reminder.medication_plan_id == plan_id,
                ReminderOccurrence.scheduled_at >= since,
                ReminderOccurrence.scheduled_at < now,
                # System-cancelled occurrences are not the user's fault; drop
                # them at the SQL layer so they don't appear in any bucket.
                ReminderOccurrence.status
                != ReminderOccurrenceStatusEnum.CANCELLED.value,
            )
            .group_by(ReminderOccurrence.status)
        )
    ).all()

    by_status: dict[str, int] = {status: int(n) for status, n in rows}
    taken = by_status.get(ReminderOccurrenceStatusEnum.DONE.value, 0)
    skipped = by_status.get(ReminderOccurrenceStatusEnum.SKIPPED.value, 0)
    missed = by_status.get(ReminderOccurrenceStatusEnum.MISSED.value, 0)
    snoozed_pending = by_status.get(ReminderOccurrenceStatusEnum.SNOOZED.value, 0)
    pending = by_status.get(ReminderOccurrenceStatusEnum.PENDING.value, 0)
    fired = by_status.get(ReminderOccurrenceStatusEnum.FIRED.value, 0)
    # `fired` (notification sent, user hasn't acted) counts as missed for the
    # adherence number once it's in the past — caller window is `< now` so
    # everything in this slice is past.
    missed_total = missed + fired + pending  # pending in past = missed
    scheduled = taken + skipped + missed_total + snoozed_pending
    percent = int(round((taken / scheduled) * 100)) if scheduled > 0 else 0
    return AdherenceDTO(
        period_days=days,
        scheduled=scheduled,
        taken=taken,
        skipped=skipped,
        missed=missed_total,
        snoozed_pending=snoozed_pending,
        pending=pending,
        percent=percent,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Import from appointment
# ─────────────────────────────────────────────────────────────────────────────


async def import_from_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
    body: MedicationImportBody,
) -> Optional[MedicationImportResult]:
    """Idempotent import — re-runs return existing plans (no duplicates).

    Each medicine in `appointment.prescription.medicines` becomes (or matches)
    one `MedicationPlan`, with its dedupe_key built from
    `sha256("{appointment_id}:{idx}:{normalized_name}")`. Default schedule is
    inferred from `medicine.frequency` text via tiny heuristics, falling back
    to caller-supplied `default_dose_times` or `["08:00"]`.
    """
    appt = (
        await db.execute(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if appt is None:
        return None

    rx = appt.prescription if isinstance(appt.prescription, dict) else None
    medicines = rx.get("medicines") if rx else None
    if not isinstance(medicines, list) or not medicines:
        return MedicationImportResult(created=[], skipped=[])

    created: list[MedicationPlanDTO] = []
    skipped: list[MedicationImportSkipped] = []

    # If the caller provided `medicine_indices`, only import the picked
    # subset. Out-of-range indices are silently ignored — the FE may have
    # been built against an older version of the prescription. We do NOT
    # treat un-picked rows as `skipped` in the response: skipped is for
    # things the caller *tried* to import that we couldn't.
    selected: Optional[set[int]] = (
        set(body.medicine_indices) if body.medicine_indices is not None else None
    )

    for idx, med in enumerate(medicines):
        if selected is not None and idx not in selected:
            continue
        if not isinstance(med, dict):
            skipped.append(
                MedicationImportSkipped(
                    medicine_index=idx, name=str(med), reason="malformed entry"
                )
            )
            continue
        name = (med.get("name") or "").strip()
        if not name:
            skipped.append(
                MedicationImportSkipped(
                    medicine_index=idx, name="", reason="missing name"
                )
            )
            continue

        dedupe_key = _make_dedupe_key(appointment_id, idx, name)
        existing = (
            await db.execute(
                select(MedicationPlan).where(
                    MedicationPlan.user_id == user_id,
                    MedicationPlan.dedupe_key == dedupe_key,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            skipped.append(
                MedicationImportSkipped(
                    medicine_index=idx,
                    name=name,
                    reason="already imported",
                    existing_plan_id=existing.id,
                )
            )
            continue

        # Default dose times: caller override > frequency heuristic > 08:00.
        if body.default_dose_times:
            dose_times = body.default_dose_times
        else:
            n = _infer_doses_per_day(med.get("frequency"))
            dose_times = _spread_default_times(n)

        # Strength + form: try to extract from `dosage` text (e.g., "500 mg
        # tablet"). Conservative — leave both null on failure.
        dosage_text = (med.get("dosage") or "").strip()
        strength = dosage_text or None

        # End date: try to parse `duration` like "5 days" or "7 ngày".
        end_date = _parse_duration_to_end_date(med.get("duration"))

        try:
            plan_dto = await create_plan(
                db,
                user_id,
                MedicationPlanCreateBody(
                    name=name,
                    strength=strength,
                    instructions=(med.get("notes") or None),
                    prescriber=(rx.get("doctor") if isinstance(rx, dict) else None) or appt.doctor_name,
                    clinic=(rx.get("clinic") if isinstance(rx, dict) else None) or appt.clinic,
                    start_date=datetime.date.today(),
                    end_date=end_date,
                    dose_times=dose_times,
                    repeat=body.default_repeat,
                ),
                appointment_id=appointment_id,
                dedupe_key=dedupe_key,
            )
            created.append(plan_dto)
        except Exception as exc:  # defensive — one bad medicine shouldn't kill the batch
            logger.exception("import_from_appointment: failed to create plan for %s", name)
            skipped.append(
                MedicationImportSkipped(
                    medicine_index=idx,
                    name=name,
                    reason=f"create failed: {type(exc).__name__}",
                )
            )

    return MedicationImportResult(created=created, skipped=skipped)


_DURATION_RE = re.compile(
    r"(\d+)\s*(day|days|d|ngay|ngày|week|weeks|w|tuần|tuan|month|months|m|tháng|thang)\b",
    re.I,
)


def _parse_duration_to_end_date(duration_text: Optional[str]) -> Optional[datetime.date]:
    if not duration_text:
        return None
    m = _DURATION_RE.search(duration_text)
    if not m:
        return None
    n = int(m.group(1))
    unit = m.group(2).lower()
    if unit.startswith(("d", "n")):  # day, ngày
        days = n
    elif unit.startswith(("w", "t")) and unit not in ("tháng", "thang"):
        days = n * 7
    else:  # month
        days = n * 30
    if days <= 0 or days > 365 * 2:
        return None
    return datetime.date.today() + datetime.timedelta(days=days - 1)
