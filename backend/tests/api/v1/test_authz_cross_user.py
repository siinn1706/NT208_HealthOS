"""Cross-user IDOR tests — REST endpoints.

Asserts that user_b cannot read, update, or delete resources owned by user_a.
Parametrized from idor-audit-matrix.md rows that have a path-ID parameter.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    Appointment,
    AppointmentStatusEnum,
    HealthMetric,
    Meal,
    MealStatusEnum,
    MetricTypeEnum,
    Notification,
    NotificationKindEnum,
    Reminder,
    ReminderRepeatEnum,
    ReminderTypeEnum,
    User,
    WearableSourceEnum,
)
from tests._helpers.matrix_loader import RestMatrixRow, load_rest_matrix

_NOW = datetime.datetime.now(datetime.timezone.utc)


# ── Resource seeders ──────────────────────────────────────────────────────────

async def _seed_appointment(db: AsyncSession, owner: User) -> uuid.UUID:
    row = Appointment(
        id=uuid.uuid4(),
        user_id=owner.id,
        appointment_date=_NOW + datetime.timedelta(days=7),
        doctor_name="Dr. Test",
        status=AppointmentStatusEnum.UPCOMING,
    )
    db.add(row)
    await db.flush()
    return row.id


async def _seed_reminder(db: AsyncSession, owner: User) -> uuid.UUID:
    row = Reminder(
        id=uuid.uuid4(),
        user_id=owner.id,
        type=ReminderTypeEnum.MEDICINE,
        title="Test Reminder",
        remind_time="08:00",
        repeat=ReminderRepeatEnum.ONCE,
        done=False,
        is_active=True,
        tzid="UTC",
    )
    db.add(row)
    await db.flush()
    return row.id


async def _seed_meal(db: AsyncSession, owner: User) -> uuid.UUID:
    row = Meal(
        id=uuid.uuid4(),
        user_id=owner.id,
        name="Test Meal",
        status=MealStatusEnum.ANALYZED,
        logged_at=_NOW,
    )
    db.add(row)
    await db.flush()
    return row.id


async def _seed_health_metric(db: AsyncSession, owner: User) -> uuid.UUID:
    row = HealthMetric(
        id=uuid.uuid4(),
        user_id=owner.id,
        metric_type=MetricTypeEnum.HEART_RATE,
        value=72.0,
        unit="bpm",
        recorded_at=_NOW,
        source=WearableSourceEnum.MANUAL,
        is_deleted=False,
    )
    db.add(row)
    await db.flush()
    return row.id


async def _seed_notification(db: AsyncSession, owner: User) -> uuid.UUID:
    row = Notification(
        id=uuid.uuid4(),
        user_id=owner.id,
        title="Test Notif",
        body="body",
        kind=NotificationKindEnum.INFO.value,
        is_read=False,
    )
    db.add(row)
    await db.flush()
    return row.id


# Map module names to seeder functions
_SEEDERS = {
    "appointments": _seed_appointment,
    "reminders": _seed_reminder,
    "meals": _seed_meal,
    "health_metrics": _seed_health_metric,
    "notifications": _seed_notification,
}


async def _seed_resource(module: str, db: AsyncSession, owner: User) -> uuid.UUID | None:
    seeder = _SEEDERS.get(module)
    if seeder is None:
        return None
    return await seeder(db, owner)


# ── Build path with resource ID ───────────────────────────────────────────────

def _build_path(path_template: str, resource_id: uuid.UUID) -> str:
    """Replace the first {xxx_id} placeholder in the path."""
    import re
    return re.sub(r"\{[^}]+\}", str(resource_id), path_template, count=1)


# ── Collect matrix rows that need cross-user testing ─────────────────────────

def _idor_candidates() -> list[RestMatrixRow]:
    rows = []
    for row in load_rest_matrix():
        if row.is_public:
            continue
        if not row.has_path_id:
            continue
        if row.module not in _SEEDERS:
            continue
        rows.append(row)
    return rows


_MATRIX_ROWS = _idor_candidates()


# ── Cross-user denial test ────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("row", _MATRIX_ROWS, ids=lambda r: f"{r.module}:{r.method}:{r.path}")
async def test_rest_cross_user_denied(
    row: RestMatrixRow,
    client_a: AsyncClient,
    client_b: AsyncClient,
    user_a: User,
    db: AsyncSession,
):
    """user_b must not access a resource owned by user_a."""
    resource_id = await _seed_resource(row.module, db, user_a)
    assert resource_id is not None

    path = _build_path(row.path, resource_id)
    method = row.method.lower()

    # Build minimal body for mutating verbs
    body = None
    if method in ("patch", "put"):
        body = {}
    elif method == "post":
        body = {}

    resp = await client_b.request(method, f"/v1{path}", json=body)
    assert resp.status_code in (row.fail_status, 403, 404), (
        f"{row.module} {row.method} {path}: expected {row.fail_status} but got {resp.status_code}"
    )


# ── Positive smoke — owner can access own resource ───────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("row", _MATRIX_ROWS, ids=lambda r: f"{r.module}:{r.method}:{r.path}")
async def test_rest_owner_can_read_own_resource(
    row: RestMatrixRow,
    client_a: AsyncClient,
    user_a: User,
    db: AsyncSession,
):
    """Owner must be able to reach own resource (owner is not denied)."""
    if row.method not in ("GET",):
        pytest.skip("positive smoke only for GET")

    resource_id = await _seed_resource(row.module, db, user_a)
    assert resource_id is not None

    path = _build_path(row.path, resource_id)
    resp = await client_a.get(f"/v1{path}")
    assert resp.status_code in (200, 201), (
        f"owner got {resp.status_code} on {path}: {resp.text}"
    )


# ── security_logs: SECURITY_ACCESS_DENIED rows must be filtered ──────────────

@pytest.mark.asyncio
async def test_security_logs_hides_access_denied_events(
    client_b: AsyncClient,
):
    """After cross-user probes, user_b's /security-logs must not expose SECURITY_ACCESS_DENIED rows."""
    resp = await client_b.get("/v1/security-logs")
    assert resp.status_code == 200
    rows = resp.json().get("items", resp.json() if isinstance(resp.json(), list) else [])
    denied = [r for r in rows if r.get("event_type") == "security_access_denied"]
    assert denied == [], f"Found {len(denied)} SECURITY_ACCESS_DENIED rows in user_b's log"
