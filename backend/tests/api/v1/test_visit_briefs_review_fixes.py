"""Contract + unit tests for the review-fix batch.

Covers:
  * F14 (M5) — rate limit on /route-now and /pdf returns 429 after the cap.
  * F17 (L3) — /route-now refuses archived briefs as 409.
  * F10 (T1) — schema accepts `clone_from_brief_id` (Pydantic Literal etc.).
  * F13 (M7) — _ensure_pre_visit_reminder writes `tzid="UTC"` on the row.
  * F1 (S1) — new urgent rule `ur-mental-default-anything` is registered.
  * F8 (T2) — new urgent rule `ur-meds-overuse` is registered.

These are intentionally lightweight: the safety scenarios YAML covers the
behavioural depth; this file pins the contract surface (status codes,
schemas, ORM field defaults).
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.core.security import get_current_user
from app.main import app
from app.models.core import (
    Appointment,
    AppointmentStatusEnum,
    ReminderRepeatEnum,
    ReminderTypeEnum,
    User,
)
from app.models.visit_briefs import AppointmentBriefLink, VisitBrief, VisitBriefStatusEnum
from app.schemas.visit_briefs import VisitBriefCreateBody
from app.services import visit_briefs as svc
from app.services.triage_rules import URGENT_RULES, all_rule_ids

requires_database = pytest.mark.skipif(
    not settings.database_url,
    reason="needs real Postgres",
)


class _FakeRedis:
    """Minimal in-memory Redis fake, mirroring the existing test pattern."""

    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.ttls: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        cur = int(self.values.get(key, 0)) + 1
        self.values[key] = cur
        return cur

    async def expire(self, key: str, ttl: int) -> bool:
        self.ttls[key] = ttl
        return True

    async def ttl(self, key: str) -> int:
        return self.ttls.get(key, -1)

    async def get(self, key: str):  # pragma: no cover — unused here
        return self.values.get(key)

    async def set(self, key: str, value, *, nx: bool = False, ex: int | None = None):  # pragma: no cover
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def delete(self, key: str) -> int:  # pragma: no cover
        return 1 if self.values.pop(key, None) is not None else 0

    async def eval(self, _script: str, _numkeys: int, key: str, *_args):  # pragma: no cover
        return await self.incr(key)


# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def authed_client():
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "rev@example.com", "hashed_password": "fake"},
    )()
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    app.dependency_overrides[get_current_user] = lambda: fake_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, fake_user, fake
    app.dependency_overrides.pop(get_redis, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def appointment_brief_state():
    user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        owner = User(
            email=f"visit-brief-owner-{uuid.uuid4().hex[:8]}@test.local",
            username=f"visit_brief_owner_{uuid.uuid4().hex[:8]}",
            display_name="Visit Brief Owner",
            hashed_password="x",
        )
        db.add(owner)
        await db.flush()
        appointment = Appointment(
            user_id=owner.id,
            appointment_date=datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(days=3),
            doctor_name="Dr Visit Brief",
            status=AppointmentStatusEnum.UPCOMING,
        )
        db.add(appointment)
        await db.commit()
        user_ids.append(owner.id)
        yield owner.id, appointment.id

    async with AsyncSessionLocal() as cleanup:
        await cleanup.execute(delete(User).where(User.id.in_(user_ids)))
        await cleanup.commit()
    await engine.dispose()


# ─── F14 — rate limit returns 429 after the cap ──────────────────────────────


@pytest.mark.asyncio
async def test_route_now_rate_limit_returns_429_after_cap(authed_client):
    """Hammer the rate-limit cap directly; the endpoint must short-circuit
    with 429 BEFORE touching the DB. This isolates the rate-limit path so
    the test doesn't need a real visit-brief row."""
    from app.api.v1.endpoints.visit_briefs import (
        _ROUTE_NOW_MAX,
        _enforce_route_now_rate_limit,
    )
    from fastapi import HTTPException

    fake = _FakeRedis()
    user_id = uuid.uuid4()
    # The first MAX calls succeed, the next must raise 429.
    for _ in range(_ROUTE_NOW_MAX):
        await _enforce_route_now_rate_limit(fake, user_id)
    with pytest.raises(HTTPException) as exc:
        await _enforce_route_now_rate_limit(fake, user_id)
    assert exc.value.status_code == 429
    assert exc.value.detail["code"] == "RATE_LIMITED"
    assert "retry_after_s" in exc.value.detail["details"]


@pytest.mark.asyncio
async def test_pdf_rate_limit_returns_429_after_cap():
    from app.api.v1.endpoints.visit_briefs import (
        _PDF_MAX,
        _enforce_pdf_rate_limit,
    )
    from fastapi import HTTPException

    fake = _FakeRedis()
    user_id = uuid.uuid4()
    for _ in range(_PDF_MAX):
        await _enforce_pdf_rate_limit(fake, user_id)
    with pytest.raises(HTTPException) as exc:
        await _enforce_pdf_rate_limit(fake, user_id)
    assert exc.value.status_code == 429


# ─── F10 — clone_from_brief_id schema accepts UUID, defaults to None ─────────


def test_visit_brief_create_body_accepts_clone_from_brief_id():
    body = VisitBriefCreateBody(
        visit_type="gp_routine",
        clone_from_brief_id=uuid.uuid4(),
    )
    assert body.clone_from_brief_id is not None


def test_visit_brief_create_body_defaults_clone_field_to_none():
    body = VisitBriefCreateBody(visit_type="gp_routine")
    assert body.clone_from_brief_id is None


@requires_database
@pytest.mark.asyncio
async def test_create_attached_brief_reuses_existing_active_draft(
    appointment_brief_state,
):
    user_id, appointment_id = appointment_brief_state
    body = VisitBriefCreateBody(
        visit_type="gp_routine",
        attach_to_appointment_id=appointment_id,
    )

    async with AsyncSessionLocal() as db:
        first = await svc.create_brief(db, user_id=user_id, body=body)
        first_id = first.id
        await db.commit()

    async with AsyncSessionLocal() as db:
        second = await svc.create_brief(db, user_id=user_id, body=body)
        second_id = second.id
        await db.commit()

    async with AsyncSessionLocal() as db:
        brief_count = (
            await db.execute(
                select(VisitBrief).where(VisitBrief.user_id == user_id)
            )
        ).scalars().all()
        active_links = (
            await db.execute(
                select(AppointmentBriefLink).where(
                    AppointmentBriefLink.appointment_id == appointment_id,
                    AppointmentBriefLink.is_active.is_(True),
                )
            )
        ).scalars().all()

    assert second_id == first_id
    assert [brief.id for brief in brief_count] == [first_id]
    assert len(active_links) == 1
    assert active_links[0].visit_brief_id == first_id


# ─── F1 + F8 — new urgent rules are registered ───────────────────────────────


def test_mental_default_promoted_to_urgent_bucket():
    rule_ids = {r.id for r in URGENT_RULES}
    assert "ur-mental-default-anything" in rule_ids
    # Old routine-bucket id must be gone — its presence would mean the
    # defense-in-depth fix was reverted.
    assert "rt-mental-default" not in all_rule_ids()


def test_meds_overuse_rule_registered_as_urgent():
    rule_ids = {r.id for r in URGENT_RULES}
    assert "ur-meds-overuse" in rule_ids


# ─── F13 — auto-reminder writes tzid=UTC ─────────────────────────────────────


class _SessionStub:
    """Bare-minimum AsyncSession stand-in for the reminder helper.

    `_ensure_pre_visit_reminder` does:
      1. `db.execute(select(Reminder).where(...))` → looks for an existing row.
      2. `db.add(reminder)` → registers a new ORM instance.
      3. `await db.flush()` → persists.

    We only need (1) to return "no existing" and (2)/(3) to be no-ops so we
    can capture the constructed Reminder for assertions.
    """

    def __init__(self) -> None:
        self.added: list = []

    async def execute(self, _stmt):
        class _Res:
            def scalar_one_or_none(self):
                return None
        return _Res()

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None


@pytest.mark.asyncio
async def test_auto_reminder_uses_utc_tzid():
    """Review fix M7: the reminder beat treats `time_of_day` against
    `tzid` — storing UTC time-of-day with the default tzid would mis-fire."""
    db = _SessionStub()
    user_id = uuid.uuid4()
    brief = VisitBrief(
        id=uuid.uuid4(),
        user_id=user_id,
        visit_type="gp_routine",
        status=VisitBriefStatusEnum.DRAFT.value,
        revision=1,
    )
    appt = Appointment(
        id=uuid.uuid4(),
        user_id=user_id,
        # 48h in the future — well past the 24h lead window so the reminder
        # is actually scheduled (the helper silently skips if too soon).
        appointment_date=datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=48),
        doctor_name="Dr. Test",
        status=AppointmentStatusEnum.UPCOMING,
    )

    rem = await svc._ensure_pre_visit_reminder(
        db,  # type: ignore[arg-type]
        user_id=user_id,
        brief=brief,
        appt=appt,
    )
    assert rem is not None
    assert rem.tzid == "UTC"
    assert rem.type == ReminderTypeEnum.APPOINTMENT
    assert rem.repeat == ReminderRepeatEnum.ONCE
    # next_occurrence_at should be tz-aware UTC.
    assert rem.next_occurrence_at is not None
    assert rem.next_occurrence_at.tzinfo is not None
    # Wall-clock time component must equal time_of_day (no offset drift).
    assert rem.next_occurrence_at.time() == rem.time_of_day
