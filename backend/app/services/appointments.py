from __future__ import annotations

import datetime
import uuid
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Appointment, AppointmentStatusEnum
from app.services._ownership import get_owned
from app.schemas.appointments import (
    AppointmentCreateBody,
    AppointmentDTO,
    AppointmentVisitType,
    AppointmentUpdateBody,
    PrescriptionPayload,
)


# B7 — explicit transition table.
# Keys are the *current* status; values are the set of valid next states.
# `RESCHEDULED` and `CANCELLED` are terminal here (rescheduling spawns a new
# appointment row in the create flow; the old one stays as `RESCHEDULED`).
_TRANSITIONS: dict[AppointmentStatusEnum, frozenset[AppointmentStatusEnum]] = {
    AppointmentStatusEnum.BOOKED: frozenset({
        AppointmentStatusEnum.SCHEDULED,
        AppointmentStatusEnum.UPCOMING,
        AppointmentStatusEnum.CANCELLED,
        AppointmentStatusEnum.RESCHEDULED,
    }),
    AppointmentStatusEnum.SCHEDULED: frozenset({
        AppointmentStatusEnum.UPCOMING,
        AppointmentStatusEnum.IN_PROGRESS,
        AppointmentStatusEnum.CANCELLED,
        AppointmentStatusEnum.RESCHEDULED,
    }),
    AppointmentStatusEnum.UPCOMING: frozenset({
        AppointmentStatusEnum.IN_PROGRESS,
        AppointmentStatusEnum.COMPLETED,
        AppointmentStatusEnum.NO_SHOW,
        AppointmentStatusEnum.CANCELLED,
        AppointmentStatusEnum.RESCHEDULED,
    }),
    AppointmentStatusEnum.IN_PROGRESS: frozenset({
        AppointmentStatusEnum.COMPLETED,
        AppointmentStatusEnum.NO_SHOW,
        AppointmentStatusEnum.CANCELLED,
    }),
    AppointmentStatusEnum.COMPLETED: frozenset(),
    AppointmentStatusEnum.CANCELLED: frozenset(),
    AppointmentStatusEnum.NO_SHOW: frozenset(),
    AppointmentStatusEnum.RESCHEDULED: frozenset(),
}


def is_valid_transition(current: AppointmentStatusEnum, target: AppointmentStatusEnum) -> bool:
    """Return True if `current → target` is allowed by the FSM."""
    return target in _TRANSITIONS.get(current, frozenset())


def valid_next_statuses(current: AppointmentStatusEnum) -> Iterable[AppointmentStatusEnum]:
    return _TRANSITIONS.get(current, frozenset())


def _resolved_status(
    status: AppointmentStatusEnum,
    appointment_date: datetime.datetime,
) -> AppointmentStatusEnum:
    """Time-aware overlay for legacy rows.

    Explicit terminal/in-progress states are preserved as-is. The coarse
    BOOKED / SCHEDULED / UPCOMING bucket gets the time-based downgrade to
    COMPLETED for past dates — restores the pre-B7 behavior so the FE's
    "upcoming" filter doesn't show appointments whose date already elapsed
    (B7 review P3-2). New code that wants the literal persisted value
    (e.g., the audit log) should read `Appointment.status` directly.
    """
    if status in (
        AppointmentStatusEnum.CANCELLED,
        AppointmentStatusEnum.COMPLETED,
        AppointmentStatusEnum.NO_SHOW,
        AppointmentStatusEnum.RESCHEDULED,
        AppointmentStatusEnum.IN_PROGRESS,
    ):
        return status
    now = datetime.datetime.now(datetime.timezone.utc)
    if appointment_date < now:
        # B7 review P3-2 — past-due BOOKED / SCHEDULED / UPCOMING all roll
        # forward to COMPLETED for display. The DB row keeps its literal
        # value; this is purely a derived view for the FE.
        return AppointmentStatusEnum.COMPLETED
    return status


def _to_dto(item: Appointment) -> AppointmentDTO:
    prescription = None
    if isinstance(item.prescription, dict) and item.prescription:
        prescription = PrescriptionPayload.model_validate(item.prescription)

    status = _resolved_status(item.status, item.appointment_date).value

    return AppointmentDTO(
        id=item.id,
        appointment_date=item.appointment_date,
        doctor_name=item.doctor_name,
        specialty=item.specialty,
        clinic=item.clinic,
        diagnosis=item.diagnosis,
        visit_type=AppointmentVisitType(getattr(item, "visit_type", AppointmentVisitType.IN_PERSON.value)),
        video_join_url=item.video_join_url,
        status=status,
        notes=item.notes,
        has_prescription=prescription is not None,
        prescription=prescription,
    )


def _assert_video_join_url_allowed(visit_type: str, video_join_url: str | None) -> None:
    if video_join_url and visit_type != AppointmentVisitType.VIDEO.value:
        raise ValueError("video_join_url is only allowed for video appointments.")


async def list_appointments(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[AppointmentDTO], int]:
    base_stmt = select(Appointment).where(Appointment.user_id == user_id)
    total_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    offset = (page - 1) * per_page
    rows = (
        await db.execute(
            base_stmt
            .order_by(Appointment.appointment_date.desc(), Appointment.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
    ).scalars().all()

    return ([_to_dto(row) for row in rows], total)


async def create_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    body: AppointmentCreateBody,
) -> AppointmentDTO:
    now = datetime.datetime.now(datetime.timezone.utc)
    status = (
        AppointmentStatusEnum.UPCOMING
        if body.appointment_date >= now
        else AppointmentStatusEnum.COMPLETED
    )

    item = Appointment(
        user_id=user_id,
        appointment_date=body.appointment_date,
        doctor_name=body.doctor_name,
        specialty=body.specialty,
        clinic=body.clinic,
        diagnosis=body.reason,
        visit_type=body.visit_type.value,
        video_join_url=body.video_join_url,
        status=status,
        notes=body.notes,
    )
    _assert_video_join_url_allowed(item.visit_type, item.video_join_url)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)


async def get_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> AppointmentDTO | None:
    item = await get_owned(db, Appointment, id_=appointment_id, user_id=user_id)
    if item is None:
        return None
    return _to_dto(item)


async def update_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
    body: AppointmentUpdateBody,
) -> AppointmentDTO | None:
    appt = await get_owned(db, Appointment, id_=appointment_id, user_id=user_id)
    if appt is None:
        return None

    updates = body.model_dump(exclude_unset=True)
    if "appointment_date" in updates:
        next_date = updates["appointment_date"]
        if next_date is None:
            raise ValueError("appointment_date cannot be null.")
        appt.appointment_date = next_date
        if appt.status in (
            AppointmentStatusEnum.BOOKED,
            AppointmentStatusEnum.SCHEDULED,
            AppointmentStatusEnum.UPCOMING,
        ):
            now = datetime.datetime.now(datetime.timezone.utc)
            appt.status = (
                AppointmentStatusEnum.UPCOMING
                if next_date >= now
                else AppointmentStatusEnum.COMPLETED
            )

    if "doctor_name" in updates:
        next_name = updates["doctor_name"]
        if next_name is None:
            raise ValueError("doctor_name cannot be null.")
        appt.doctor_name = next_name

    if "specialty" in updates:
        appt.specialty = updates["specialty"]
    if "clinic" in updates:
        appt.clinic = updates["clinic"]
    if "reason" in updates:
        appt.diagnosis = updates["reason"]
    if "notes" in updates:
        appt.notes = updates["notes"]
    if "visit_type" in updates:
        next_visit_type = updates["visit_type"]
        if next_visit_type is None:
            raise ValueError("visit_type cannot be null.")
        appt.visit_type = next_visit_type.value
        if appt.visit_type != AppointmentVisitType.VIDEO.value:
            appt.video_join_url = None
    if "video_join_url" in updates:
        appt.video_join_url = updates["video_join_url"]

    _assert_video_join_url_allowed(appt.visit_type, appt.video_join_url)

    await db.flush()
    await db.refresh(appt)
    return _to_dto(appt)


class InvalidStatusTransition(ValueError):
    """Raised when a caller asks for a status the FSM forbids."""

    def __init__(self, current: AppointmentStatusEnum, target: AppointmentStatusEnum):
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition appointment from {current.value} to {target.value}.")


async def update_appointment_status(
    db: AsyncSession,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
    target: AppointmentStatusEnum,
) -> AppointmentDTO | None:
    """Apply a status transition; raises InvalidStatusTransition on bad input."""
    appt = await get_owned(db, Appointment, id_=appointment_id, user_id=user_id)
    if appt is None:
        return None

    if appt.status == target:
        # Idempotent — same status is a no-op.
        return _to_dto(appt)
    if not is_valid_transition(appt.status, target):
        raise InvalidStatusTransition(appt.status, target)

    appt.status = target
    await db.flush()
    return _to_dto(appt)

