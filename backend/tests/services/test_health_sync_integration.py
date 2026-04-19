"""Integration tests for the Health Connect sync service against the live
dev Postgres. These exercise the bits unit tests can't:

  * The partial unique index `uq_health_metrics_external_id` actually
    prevents duplicates.
  * `INSERT ... ON CONFLICT DO UPDATE WHERE` correctly applies the
    "newer wins" rule and rejects stale NULL incoming versions (H2).
  * The `xmax = 0` insert/update accounting (M3) returns honest counts.
  * Tombstones (`is_deleted=true`) are written on deletion AND are
    invisible to the analytics queries (H1).
  * The `consecutive_failures >= 5` threshold (H5) flips device status
    only on the fifth failure.
  * `permissions.update_permissions` correctly classifies revoke /
    re-grant / unchanged transitions (H3).

Run only when a Postgres DB at `settings.database_url` is reachable.
The medication lifecycle suite uses the same pattern.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

from app.adapters.database import AsyncSessionLocal, engine
from app.models import health_goal  # noqa: F401  (force mapper configuration)
from app.models.core import (
    ConnectedDevice,
    DeviceSyncState,
    HealthMetric,
    MetricTypeEnum,
    User,
    WearableProviderEnum,
    WearableSourceEnum,
)
from app.schemas.sync import (
    HealthDeletionIn,
    HealthIngestBatch,
    HealthRecordIn,
)
from app.services import devices as device_svc
from app.services import health_metrics as metric_svc
from app.services import health_sync as sync_svc


pytestmark = pytest.mark.asyncio


def _record(
    *,
    external_id: str,
    metric_type: MetricTypeEnum = MetricTypeEnum.STEPS,
    value: float = 1500,
    unit: str = "steps",
    external_version: int | None = 100,
    recorded_at: datetime.datetime | None = None,
) -> HealthRecordIn:
    return HealthRecordIn(
        external_id=external_id,
        external_version=external_version,
        metric_type=metric_type,
        value=value,
        unit=unit,
        recorded_at=recorded_at
        or datetime.datetime(2026, 4, 19, 12, tzinfo=datetime.timezone.utc),
        source=WearableSourceEnum.HEALTH_CONNECT,
        source_app="com.google.android.apps.fitness",
        recording_method="automatic",
    )


@pytest_asyncio.fixture
async def temp_user_and_device():
    """Create a throwaway user + connected HC device, yield (user_id, device_id),
    then cascade-delete on teardown so the dev DB stays clean."""
    async with AsyncSessionLocal() as db:
        u = User(
            email=f"hc-int-{uuid.uuid4().hex[:8]}@local",
            username=f"hcint_{uuid.uuid4().hex[:8]}",
            display_name="hc-integration",
            hashed_password="x",
        )
        db.add(u)
        await db.flush()

        device = ConnectedDevice(
            user_id=u.id,
            provider=WearableProviderEnum.HEALTH_CONNECT,
            external_account_id=f"com.healthos.app.test.{uuid.uuid4().hex[:6]}",
            device_label="HC Integration Test",
            scopes=["Steps", "HeartRate", "SleepSession", "Weight"],
            connected_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(device)
        await db.commit()
        user_id, device_id = u.id, device.id

    try:
        yield user_id, device_id
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
        # Mirrors the medication lifecycle suite: dispose the engine so
        # asyncpg connections from this test don't leak into the next
        # event loop (pytest-asyncio creates a fresh loop per test).
        await engine.dispose()


async def _load_device(db, device_id: uuid.UUID) -> ConnectedDevice:
    item = (
        await db.execute(
            select(ConnectedDevice).where(ConnectedDevice.id == device_id)
        )
    ).scalar_one()
    return item


async def _count_health_rows(db, user_id: uuid.UUID, *, include_deleted: bool = True) -> int:
    stmt = select(HealthMetric).where(HealthMetric.user_id == user_id)
    if not include_deleted:
        stmt = stmt.where(HealthMetric.is_deleted.is_(False))
    rows = (await db.execute(stmt)).scalars().all()
    return len(rows)


# ── Dedupe + newer-wins ───────────────────────────────────────────────────


async def test_first_insert_persists_one_row(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db,
            user_id,
            device,
            HealthIngestBatch(records=[_record(external_id="rec-A")]),
        )
        await db.commit()
        assert result.inserted == 1
        assert result.updated == 0
        assert result.skipped == 0
        assert await _count_health_rows(db, user_id) == 1


async def test_replay_of_same_record_is_a_noop(temp_user_and_device):
    """Same external_id with the SAME version — the WHERE-on-conflict
    rejects the row (existing version is not strictly less than incoming),
    so RETURNING is empty for that row and `skipped` accounts for it."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        rec = _record(external_id="rec-replay", external_version=100)
        await sync_svc.upsert_batch(db, user_id, device, HealthIngestBatch(records=[rec]))
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device, HealthIngestBatch(records=[rec])
        )
        await db.commit()
        # No insert (key exists), no update (version not strictly higher),
        # so all rows fall into `skipped`.
        assert result.inserted == 0
        assert result.updated == 0
        assert result.skipped == 1
        assert await _count_health_rows(db, user_id) == 1


async def test_newer_version_updates_in_place(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-bump", external_version=100, value=1000)]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-bump", external_version=200, value=2000)]),
        )
        await db.commit()
        assert result.inserted == 0
        assert result.updated == 1
        # And the value is the new one, not the original.
        row = (
            await db.execute(
                select(HealthMetric).where(
                    HealthMetric.user_id == user_id,
                    HealthMetric.external_id == "rec-bump",
                )
            )
        ).scalar_one()
        assert row.value == 2000.0


async def test_older_version_is_rejected(temp_user_and_device):
    """A stale replay must NOT overwrite a fresher row."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-fresh", external_version=200, value=2000)]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-fresh", external_version=100, value=999)]),
        )
        await db.commit()
        assert result.inserted == 0
        assert result.updated == 0
        assert result.skipped == 1
        row = (
            await db.execute(
                select(HealthMetric).where(
                    HealthMetric.user_id == user_id,
                    HealthMetric.external_id == "rec-fresh",
                )
            )
        ).scalar_one()
        assert row.value == 2000.0  # Unchanged


async def test_null_incoming_version_does_not_overwrite_real_version(temp_user_and_device):
    """H2 fix: an incoming row with NULL external_version must NOT win
    against a row that has a real version (no matter how stale we'd
    otherwise treat it)."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-versioned", external_version=42, value=42)]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-versioned", external_version=None, value=999)]),
        )
        await db.commit()
        assert result.updated == 0
        row = (
            await db.execute(
                select(HealthMetric).where(
                    HealthMetric.user_id == user_id,
                    HealthMetric.external_id == "rec-versioned",
                )
            )
        ).scalar_one()
        assert row.value == 42.0  # NOT overwritten by the NULL-versioned incoming


async def test_existing_null_version_can_be_repaired(temp_user_and_device):
    """The matching half of H2 — a row that already lacks a version
    SHOULD accept any incoming row to "upgrade" its provenance."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-null", external_version=None, value=10)]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-null", external_version=5, value=20)]),
        )
        await db.commit()
        assert result.updated == 1


# ── is_deleted flow + analytics filter ───────────────────────────────────


async def test_dedicated_deletion_marks_row_and_hides_from_list(temp_user_and_device):
    """H1 + M7: HealthDeletionIn flips is_deleted=true AND list_health_metrics
    no longer surfaces the row."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-tomb")]),
        )
        await db.commit()
        # Sanity: the analytics surface DOES return it.
        rows, total = await metric_svc.list_health_metrics(db, user_id)
        assert total == 1
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        result = await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(deletions=[HealthDeletionIn(external_id="rec-tomb")]),
        )
        await db.commit()
        assert result.deleted == 1
    # Now the analytics query must hide the tombstoned row, even though
    # the row itself is still in the DB (audit + undo path).
    async with AsyncSessionLocal() as db:
        rows, total = await metric_svc.list_health_metrics(db, user_id)
        assert total == 0
        assert await _count_health_rows(db, user_id, include_deleted=True) == 1
        assert await _count_health_rows(db, user_id, include_deleted=False) == 0


async def test_legacy_is_deleted_flag_still_works(temp_user_and_device):
    """Backward compat — older mobile builds use HealthRecordIn.is_deleted
    instead of the dedicated deletions list."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[_record(external_id="rec-legacy-tomb")]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        legacy = HealthRecordIn(
            external_id="rec-legacy-tomb",
            metric_type=MetricTypeEnum.STEPS,
            value=0,
            unit="steps",
            recorded_at=datetime.datetime(2026, 4, 19, 12, tzinfo=datetime.timezone.utc),
            source=WearableSourceEnum.HEALTH_CONNECT,
            is_deleted=True,
        )
        result = await sync_svc.upsert_batch(
            db, user_id, device, HealthIngestBatch(records=[legacy])
        )
        await db.commit()
        assert result.deleted == 1


async def test_aggregations_exclude_tombstones(temp_user_and_device):
    """`aggregate_by_period` must skip is_deleted=true rows."""
    user_id, device_id = temp_user_and_device
    today = datetime.datetime.now(datetime.timezone.utc)
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(records=[
                _record(external_id="agg-1", value=100, recorded_at=today),
                _record(external_id="agg-2", value=200, recorded_at=today),
            ]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        # Aggregation sees both rows initially.
        result = await metric_svc.aggregate_by_period(
            db, user_id, MetricTypeEnum.STEPS, "daily",
            today.date(), today.date(),
        )
        assert result and result[0]["count"] == 2
    # Soft-delete one row; aggregation must ignore it.
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(deletions=[HealthDeletionIn(external_id="agg-1")]),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        result = await metric_svc.aggregate_by_period(
            db, user_id, MetricTypeEnum.STEPS, "daily",
            today.date(), today.date(),
        )
        assert result and result[0]["count"] == 1


# ── Token persistence + consecutive_failures threshold ───────────────────


async def test_tokens_persist_in_sync_state(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(
                records=[],
                next_changes_tokens={"Steps": "tok-A", "HeartRate": "tok-B"},
            ),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(DeviceSyncState).where(DeviceSyncState.device_id == device_id)
            )
        ).scalars().all()
        by_type = {r.record_type: r.changes_token for r in rows}
        assert by_type == {"Steps": "tok-A", "HeartRate": "tok-B"}


async def test_mark_failed_does_not_clobber_token(temp_user_and_device):
    """M2 fix — the failure path must NOT erase a previously-stored
    token, otherwise the next sync wastes a 14-day bootstrap."""
    user_id, device_id = temp_user_and_device
    # Step 1: write a healthy token.
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(next_changes_tokens={"Steps": "healthy-token"}),
        )
        await db.commit()
    # Step 2: a failure run for Steps.
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.mark_failed(db, device, ["Steps"], "TRANSIENT")
        await db.commit()
    # Step 3: token must still be there.
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(
                select(DeviceSyncState).where(
                    DeviceSyncState.device_id == device_id,
                    DeviceSyncState.record_type == "Steps",
                )
            )
        ).scalar_one()
        assert row.changes_token == "healthy-token"
        assert row.consecutive_failures == 1


async def test_consecutive_failures_threshold(temp_user_and_device):
    """H5 fix — first 4 failures keep status at 'partial'; the 5th flips
    to 'error'."""
    user_id, device_id = temp_user_and_device
    for attempt in range(1, 5):
        async with AsyncSessionLocal() as db:
            device = await _load_device(db, device_id)
            await sync_svc.mark_failed(db, device, ["Steps"], f"FAIL_{attempt}")
            await db.commit()
        async with AsyncSessionLocal() as db:
            d = await _load_device(db, device_id)
            assert d.last_sync_status == "partial", f"attempt {attempt}"
            row = (
                await db.execute(
                    select(DeviceSyncState).where(
                        DeviceSyncState.device_id == device_id,
                        DeviceSyncState.record_type == "Steps",
                    )
                )
            ).scalar_one()
            assert row.consecutive_failures == attempt
    # Fifth failure crosses the threshold.
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.mark_failed(db, device, ["Steps"], "FAIL_5")
        await db.commit()
    async with AsyncSessionLocal() as db:
        d = await _load_device(db, device_id)
        assert d.last_sync_status == "error"


async def test_successful_sync_clears_failure_counter(temp_user_and_device):
    """Recovery path — a successful sync resets consecutive_failures."""
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.mark_failed(db, device, ["Steps"], "FLAKE")
        await sync_svc.mark_failed(db, device, ["Steps"], "FLAKE")
        await db.commit()
    async with AsyncSessionLocal() as db:
        device = await _load_device(db, device_id)
        await sync_svc.upsert_batch(
            db, user_id, device,
            HealthIngestBatch(next_changes_tokens={"Steps": "recovered"}),
        )
        await db.commit()
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(
                select(DeviceSyncState).where(
                    DeviceSyncState.device_id == device_id,
                    DeviceSyncState.record_type == "Steps",
                )
            )
        ).scalar_one()
        assert row.consecutive_failures == 0
        assert row.changes_token == "recovered"


# ── Permission revocation transitions ─────────────────────────────────────


async def test_update_permissions_revoked_flips_status(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        dto, transition = await device_svc.update_permissions(
            db, user_id, device_id, []
        )
        await db.commit()
        assert transition == "revoked"
        assert dto is not None
        assert dto.last_sync_status == "permission_denied"
        assert dto.scopes == []


async def test_update_permissions_re_grant_clears_status(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    # Revoke first.
    async with AsyncSessionLocal() as db:
        await device_svc.update_permissions(db, user_id, device_id, [])
        await db.commit()
    async with AsyncSessionLocal() as db:
        dto, transition = await device_svc.update_permissions(
            db, user_id, device_id, ["Steps", "HeartRate"]
        )
        await db.commit()
        assert transition == "re_granted"
        assert dto is not None
        assert dto.last_sync_status == "ok"
        assert set(dto.scopes or []) == {"Steps", "HeartRate"}


async def test_update_permissions_unchanged_is_silent(temp_user_and_device):
    user_id, device_id = temp_user_and_device
    async with AsyncSessionLocal() as db:
        dto, transition = await device_svc.update_permissions(
            db, user_id, device_id,
            ["Steps", "HeartRate", "SleepSession", "Weight"],
        )
        await db.commit()
        assert transition == "unchanged"


async def test_update_permissions_returns_none_for_other_users_device(temp_user_and_device):
    """Authorization scope: caller can only PATCH their own device row."""
    _, device_id = temp_user_and_device
    other_user = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        dto, transition = await device_svc.update_permissions(
            db, other_user, device_id, ["Steps"]
        )
        await db.commit()
        assert dto is None
        assert transition is None
