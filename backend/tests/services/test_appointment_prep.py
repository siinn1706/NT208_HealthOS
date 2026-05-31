from __future__ import annotations

import datetime
import asyncio
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select

from app.adapters.database import AsyncSessionLocal, engine
from app.models.appointment_prep import AppointmentPrep
from app.models.core import Appointment, AppointmentStatusEnum, User
from app.schemas.appointment_prep import AppointmentPrepUpdateBody
from app.services import appointment_prep as prep_svc

pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


@pytest_asyncio.fixture
async def prep_state():
    user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        owner = User(
            email=f"prep-owner-{uuid.uuid4().hex[:8]}@test.local",
            username=f"prep_owner_{uuid.uuid4().hex[:8]}",
            display_name="Prep Owner",
            hashed_password="x",
        )
        other = User(
            email=f"prep-other-{uuid.uuid4().hex[:8]}@test.local",
            username=f"prep_other_{uuid.uuid4().hex[:8]}",
            display_name="Prep Other",
            hashed_password="x",
        )
        db.add_all([owner, other])
        await db.flush()
        appt = Appointment(
            user_id=owner.id,
            appointment_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2),
            doctor_name="Dr Prep",
            status=AppointmentStatusEnum.UPCOMING,
        )
        db.add(appt)
        await db.commit()
        user_ids.extend([owner.id, other.id])
        yield owner.id, other.id, appt.id

    async with AsyncSessionLocal() as cleanup:
        await cleanup.execute(delete(User).where(User.id.in_(user_ids)))
        await cleanup.commit()
    await engine.dispose()


@pytest.mark.asyncio
async def test_appointment_prep_persists_and_reloads(prep_state):
    owner_id, _other_id, appointment_id = prep_state
    body = AppointmentPrepUpdateBody(
        checklist_items=[
            {"id": "1-card", "label": "Bring insurance card", "checked": True},
            {"id": "2-meds", "label": "List current medications", "checked": False},
        ],
    )

    async with AsyncSessionLocal() as db:
        saved = await prep_svc.upsert_prep(
            db,
            user_id=owner_id,
            appointment_id=appointment_id,
            body=body,
        )
        await db.commit()

    assert saved is not None
    assert saved.checklist_items[0].checked is True

    async with AsyncSessionLocal() as db:
        reloaded = await prep_svc.get_prep(
            db,
            user_id=owner_id,
            appointment_id=appointment_id,
        )

    assert reloaded is not None
    assert [item.checked for item in reloaded.checklist_items] == [True, False]


@pytest.mark.asyncio
async def test_appointment_prep_is_owner_scoped(prep_state):
    _owner_id, other_id, appointment_id = prep_state

    async with AsyncSessionLocal() as db:
        assert await prep_svc.get_prep(
            db,
            user_id=other_id,
            appointment_id=appointment_id,
        ) is None
        assert await prep_svc.upsert_prep(
            db,
            user_id=other_id,
            appointment_id=appointment_id,
            body=AppointmentPrepUpdateBody(checklist_items=[]),
        ) is None


@pytest.mark.asyncio
async def test_appointment_prep_concurrent_first_save_keeps_single_row(prep_state):
    owner_id, _other_id, appointment_id = prep_state

    async def save(label: str, checked: bool):
        async with AsyncSessionLocal() as db:
            saved = await prep_svc.upsert_prep(
                db,
                user_id=owner_id,
                appointment_id=appointment_id,
                body=AppointmentPrepUpdateBody(
                    checklist_items=[{"id": "1-card", "label": label, "checked": checked}],
                ),
            )
            await db.commit()
            return saved

    first, second = await asyncio.gather(
        save("Bring insurance card", True),
        save("Bring insurance card", False),
    )

    assert first is not None
    assert second is not None

    async with AsyncSessionLocal() as db:
        row_count = (
            await db.execute(
                select(func.count()).select_from(AppointmentPrep).where(
                    AppointmentPrep.appointment_id == appointment_id,
                )
            )
        ).scalar_one()

    assert row_count == 1
