from __future__ import annotations

import datetime
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Appointment, AppointmentStatusEnum
from app.schemas.appointments import AppointmentCreateBody, AppointmentDTO, PrescriptionPayload


def _resolved_status(
    status: AppointmentStatusEnum,
    appointment_date: datetime.datetime,
) -> AppointmentStatusEnum:
    if status == AppointmentStatusEnum.CANCELLED:
        return status
    now = datetime.datetime.now(datetime.timezone.utc)
    if appointment_date < now:
        return AppointmentStatusEnum.COMPLETED
    return AppointmentStatusEnum.UPCOMING


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
        status=status,
        notes=item.notes,
        has_prescription=prescription is not None,
        prescription=prescription,
    )


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
        status=status,
        notes=body.notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)

