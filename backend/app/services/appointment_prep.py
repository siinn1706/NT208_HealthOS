from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment_prep import AppointmentPrep
from app.models.core import Appointment
from app.schemas.appointment_prep import AppointmentPrepDTO, AppointmentPrepUpdateBody
from app.services._ownership import get_owned


def _to_dto(appointment_id: uuid.UUID, prep: AppointmentPrep | None) -> AppointmentPrepDTO:
    if prep is None:
        return AppointmentPrepDTO(appointment_id=appointment_id, checklist_items=[])
    return AppointmentPrepDTO(
        appointment_id=prep.appointment_id,
        checklist_items=prep.checklist_items or [],
        notes=prep.notes,
        updated_at=prep.updated_at,
    )


async def get_prep(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> AppointmentPrepDTO | None:
    appt = await get_owned(db, Appointment, id_=appointment_id, user_id=user_id)
    if appt is None:
        return None
    prep = (
        await db.execute(
            select(AppointmentPrep).where(
                AppointmentPrep.user_id == user_id,
                AppointmentPrep.appointment_id == appointment_id,
            )
        )
    ).scalar_one_or_none()
    return _to_dto(appointment_id, prep)


async def upsert_prep(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
    body: AppointmentPrepUpdateBody,
) -> AppointmentPrepDTO | None:
    appt = await get_owned(db, Appointment, id_=appointment_id, user_id=user_id)
    if appt is None:
        return None

    updates = body.model_dump(exclude_unset=True)
    insert_values = {
        "appointment_id": appointment_id,
        "user_id": user_id,
        "checklist_items": [],
    }
    update_values = {
        "user_id": user_id,
        "updated_at": func.now(),
    }
    if "checklist_items" in updates:
        checklist_items = [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in (body.checklist_items or [])
        ]
        insert_values["checklist_items"] = checklist_items
        update_values["checklist_items"] = checklist_items
    if "notes" in updates:
        insert_values["notes"] = body.notes
        update_values["notes"] = body.notes

    stmt = (
        pg_insert(AppointmentPrep)
        .values(**insert_values)
        .on_conflict_do_update(
            constraint="uq_appointment_preps_appointment_id",
            set_=update_values,
        )
        .returning(AppointmentPrep)
    )
    prep = (await db.execute(stmt)).scalar_one()
    return _to_dto(appointment_id, prep)
