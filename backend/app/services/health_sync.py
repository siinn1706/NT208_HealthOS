"""Health Connect ingestion service.

`upsert_batch` is the workhorse: takes a validated `HealthIngestBatch`,
splits it into normal upserts vs tombstones, and uses PostgreSQL
`INSERT ... ON CONFLICT ... DO UPDATE WHERE EXCLUDED.external_version
> health_metrics.external_version` to guarantee:

  * No duplicates — the partial unique index on
    (user_id, source, external_id) WHERE external_id IS NOT NULL
    enforces it.
  * Newer wins — a stale replay can't overwrite a fresh server row.
  * Manual rows are untouched — they carry external_id=NULL and are
    therefore exempt from the conflict target.

Tokens for `device_sync_state` are persisted in the same DB transaction
as the row writes, so a partial failure rolls back both — no risk of
"we wrote rows but lost the new token, so next sync re-pulls them".
"""
from __future__ import annotations

import datetime
import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import literal_column, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    ConnectedDevice,
    DeviceSyncState,
    HealthMetric,
    WearableProviderEnum,
    WearableSourceEnum,
)
from app.schemas.sync import (
    HealthDeletionIn,
    HealthIngestBatch,
    HealthIngestErrorRow,
    HealthIngestResult,
    HealthRecordIn,
    SyncStateEntry,
)
from app.services.wearable_sync.ws_publish import publish_vitals_updated

logger = logging.getLogger(__name__)

# Chunk size for the PostgreSQL upsert. 100 keeps each statement well under
# the parameter limit (PostgreSQL allows ~32k bind parameters; each row
# uses ~12) and bounds lock duration on `health_metrics`.
_UPSERT_CHUNK = 100
_MAX_ACCEPTED_FUTURE_SKEW = datetime.timedelta(minutes=5)
_MAX_ACCEPTED_HISTORY = datetime.timedelta(days=3650)
_MAX_EXTERNAL_VERSION_FUTURE_SKEW_MS = 86_400_000
_HEALTH_CONNECT_EXTERNAL_ID_PREFIX = "hc"


_PROVIDER_TO_SOURCE: dict[str, WearableSourceEnum] = {
    "health_connect": WearableSourceEnum.HEALTH_CONNECT,
    "google_health": WearableSourceEnum.GOOGLE_HEALTH,
}


@dataclass(frozen=True)
class _NormalizedRecord:
    """Cleaned-up record ready for the DB. Validation already happened in
    the Pydantic layer; this dataclass exists so the upsert can reference
    fields by attribute rather than by dict-key (cheap typo prevention)."""

    user_id: uuid.UUID
    device_id: uuid.UUID
    metric_type: str
    value: float
    unit: str
    recorded_at: datetime.datetime
    source: str
    source_app: str | None
    recording_method: str | None
    external_id: str
    external_version: int | None


def _derived_source(device: ConnectedDevice) -> WearableSourceEnum:
    try:
        return _PROVIDER_TO_SOURCE[device.provider.value]
    except KeyError as exc:  # pragma: no cover - defensive
        raise ValueError(
            f"Unsupported wearable provider for ingest: {device.provider.value}"
        ) from exc


def _normalize_timestamp(
    recorded_at: datetime.datetime,
    *,
    now: datetime.datetime,
) -> datetime.datetime:
    normalized = recorded_at
    if normalized.tzinfo is None:
        normalized = normalized.replace(tzinfo=datetime.timezone.utc)
    else:
        normalized = normalized.astimezone(datetime.timezone.utc)
    if normalized > now + _MAX_ACCEPTED_FUTURE_SKEW:
        raise ValueError("recorded_at is too far in the future.")
    if normalized < now - _MAX_ACCEPTED_HISTORY:
        raise ValueError("recorded_at is too old.")
    return normalized


def _normalize_external_version(
    external_version: int | None,
    *,
    now: datetime.datetime,
) -> int | None:
    if external_version is None:
        return None
    max_allowed = int(now.timestamp() * 1000) + _MAX_EXTERNAL_VERSION_FUTURE_SKEW_MS
    if external_version > max_allowed:
        raise ValueError("external_version exceeds the accepted time window.")
    return external_version


def _sanitize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _canonicalize_external_id(device: ConnectedDevice, external_id: str) -> str:
    cleaned = external_id.strip()
    if device.provider == WearableProviderEnum.HEALTH_CONNECT:
        prefix = f"{_HEALTH_CONNECT_EXTERNAL_ID_PREFIX}:{device.id}:"
        if cleaned.startswith(prefix):
            return cleaned
        return f"{prefix}{cleaned}"
    return cleaned


def validate_ingest_batch(
    device: ConnectedDevice,
    batch: HealthIngestBatch,
    *,
    now: datetime.datetime | None = None,
) -> HealthIngestBatch:
    """Canonicalize the wearable batch at the trust boundary.

    The device/provider relationship is authoritative; client-supplied
    provenance metadata is advisory only and must not drive dedupe or
    overwrite logic.
    """
    now = now or datetime.datetime.now(datetime.timezone.utc)
    source = _derived_source(device)
    records = [
        rec.model_copy(
            update={
                "recorded_at": _normalize_timestamp(rec.recorded_at, now=now),
                "source": source,
                "source_app": _sanitize_optional_text(rec.source_app),
                "recording_method": _sanitize_optional_text(rec.recording_method),
                "external_id": _canonicalize_external_id(device, rec.external_id),
                "external_version": _normalize_external_version(
                    rec.external_version, now=now
                ),
            }
        )
        for rec in batch.records
    ]
    deletions = [
        tombstone.model_copy(
            update={"external_id": _canonicalize_external_id(device, tombstone.external_id)}
        )
        for tombstone in batch.deletions
    ]
    return batch.model_copy(
        update={
            "provider": device.provider.value,
            "records": records,
            "deletions": deletions,
        }
    )


def _split(
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    records: list[HealthRecordIn],
    deletions: list[HealthDeletionIn] | None = None,
) -> tuple[list[_NormalizedRecord], list[str]]:
    """Partition the batch into upserts and deletion external_ids.

    Folds together two sources of tombstones (M7 fix):
      * Legacy: `HealthRecordIn.is_deleted=true` rows in `records`.
      * Preferred: dedicated `HealthDeletionIn` entries in `deletions`.

    Returns the upsert list + a flat list of external_ids to soft-delete.
    """
    upserts: list[_NormalizedRecord] = []
    delete_ids: list[str] = []
    for rec in records:
        if rec.is_deleted:
            delete_ids.append(rec.external_id)
            continue
        upserts.append(
            _NormalizedRecord(
                user_id=user_id,
                device_id=device_id,
                metric_type=rec.metric_type.value,
                value=rec.value,
                unit=rec.unit,
                recorded_at=rec.recorded_at,
                source=rec.source.value,
                source_app=rec.source_app,
                recording_method=rec.recording_method,
                external_id=rec.external_id,
                external_version=rec.external_version,
            )
        )
    for tombstone in deletions or []:
        delete_ids.append(tombstone.external_id)
    return upserts, delete_ids


async def _upsert_chunk(
    db: AsyncSession,
    chunk: list[_NormalizedRecord],
) -> tuple[int, int]:
    """Upsert one chunk and return (inserted, updated) counts.

    Distinguishes insert from update via PostgreSQL's `xmax` system
    column: `xmax = 0` on a returned row means it was freshly inserted
    in this statement; non-zero means an UPDATE that took place because
    of `ON CONFLICT`. Rows the WHERE-on-conflict rejected are absent
    from RETURNING entirely, so they don't count toward either.
    """
    if not chunk:
        return 0, 0

    payload = [
        {
            "id": uuid.uuid4(),
            "user_id": r.user_id,
            "device_id": r.device_id,
            "metric_type": r.metric_type,
            "value": r.value,
            "unit": r.unit,
            "recorded_at": r.recorded_at,
            "source": r.source,
            "source_app": r.source_app,
            "recording_method": r.recording_method,
            "external_id": r.external_id,
            "external_version": r.external_version,
            "is_deleted": False,
            "deleted_at": None,
        }
        for r in chunk
    ]

    stmt = pg_insert(HealthMetric).values(payload)
    excluded = stmt.excluded
    update_cols = {
        "metric_type": excluded.metric_type,
        "value": excluded.value,
        "unit": excluded.unit,
        "recorded_at": excluded.recorded_at,
        "source_app": excluded.source_app,
        "recording_method": excluded.recording_method,
        "external_version": excluded.external_version,
        "device_id": excluded.device_id,
        "is_deleted": False,
        "deleted_at": None,
    }
    # Newer wins. Two cases let the update through:
    #   1. The existing row has no version annotation — anything is an
    #      improvement over "unknown."
    #   2. The incoming row carries a strictly higher version.
    # An incoming NULL (caller forgot to set it, or HC's metadata was
    # stripped) is NOT allowed to overwrite a real version, otherwise a
    # buggy/stale source app could silently corrupt fresher rows.
    where_clause = (
        HealthMetric.external_version.is_(None)
        | (
            excluded.external_version.isnot(None)
            & (excluded.external_version > HealthMetric.external_version)
        )
    )
    # `xmax` is the system column PostgreSQL stamps on the returned row.
    # On a fresh INSERT it's 0; on an UPDATE-via-ON-CONFLICT it's the
    # transaction id of whatever INSERT lost the race. We compare against
    # text '0' rather than int because xmax is xid (a system OID-style
    # type) — text comparison is the documented portable trick.
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "source", "external_id"],
        index_where=HealthMetric.external_id.isnot(None),
        set_=update_cols,
        where=where_clause,
    ).returning(literal_column("(xmax = 0)").label("was_insert"))
    rows = (await db.execute(stmt)).all()
    inserted = 0
    updated = 0
    for (was_insert,) in rows:
        if was_insert:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


async def _apply_deletions(
    db: AsyncSession,
    user_id: uuid.UUID,
    external_ids: list[str],
) -> int:
    """Mark matching rows as soft-deleted. Returns the number of rows
    actually flipped (i.e. excludes the case where HC reports a deletion
    for a record we never imported)."""
    if not external_ids:
        return 0
    now = datetime.datetime.now(datetime.timezone.utc)
    stmt = (
        update(HealthMetric)
        .where(
            HealthMetric.user_id == user_id,
            HealthMetric.source == WearableSourceEnum.HEALTH_CONNECT,
            HealthMetric.external_id.in_(external_ids),
            HealthMetric.is_deleted.is_(False),
        )
        .values(is_deleted=True, deleted_at=now)
    )
    result = await db.execute(stmt)
    return int(result.rowcount or 0)


async def upsert_batch(
    db: AsyncSession,
    user_id: uuid.UUID,
    device: ConnectedDevice,
    batch: HealthIngestBatch,
    *,
    ws_source: str = "health_connect",
) -> HealthIngestResult:
    """Top-level entrypoint. Persists rows + per-record-type tokens in
    a single transaction (the surrounding endpoint owns the commit).

    ``ws_source`` tags the ``vitals.updated`` WS event so the dashboard
    can distinguish a mobile-foreground sync from a server-side Google
    Health poll. Defaults to ``"health_connect"`` because the only
    in-tree caller other than the Celery task is the mobile ingest
    endpoint.
    """
    batch = validate_ingest_batch(device, batch)
    upserts, deletion_ids = _split(user_id, device.id, batch.records, batch.deletions)

    inserted = 0
    updated = 0
    errors: list[HealthIngestErrorRow] = []

    for i in range(0, len(upserts), _UPSERT_CHUNK):
        chunk = upserts[i : i + _UPSERT_CHUNK]
        try:
            ins, upd = await _upsert_chunk(db, chunk)
            inserted += ins
            updated += upd
        except Exception as exc:  # pragma: no cover — defensive
            # On a chunk failure we record one error per row in the chunk
            # so the client can decide what to do (typically: drop and
            # let the next sync re-pull them via the changes-token).
            logger.exception("Chunk upsert failed for device %s", device.id)
            errors.extend(
                HealthIngestErrorRow(external_id=r.external_id, reason="UPSERT_FAILED")
                for r in chunk
            )

    deleted = await _apply_deletions(db, user_id, deletion_ids)

    # Persist the new tokens. We treat an empty-string token the same as
    # null so the device can explicitly invalidate state without DELETE.
    for record_type, token in batch.next_changes_tokens.items():
        await _upsert_sync_state_success(db, device.id, record_type, token)

    skipped = max(0, len(upserts) - inserted - updated)

    # Stamp the device summary so the UI can show the latest sync at a
    # glance without needing to read sync_states or audit logs.
    now = datetime.datetime.now(datetime.timezone.utc)
    device.last_synced_at = now
    device.last_attempted_at = now
    device.last_sync_count = inserted + updated + deleted
    device.last_sync_error = None
    if errors:
        device.last_sync_status = "partial"
    else:
        device.last_sync_status = "ok"

    # WS fan-out so the web dashboard refreshes without a reload. Best
    # effort — `publish_vitals_updated` swallows delivery errors so a
    # WS hiccup can't undo a successful DB transaction. The endpoint
    # commits AFTER this call returns, but the dashboard re-fetches
    # from /v1/vitals on the event (no PHI on the wire), so the tiny
    # race between push and commit is benign.
    await publish_vitals_updated(
        user_id, source=ws_source, count=inserted + updated
    )

    return HealthIngestResult(
        inserted=inserted,
        updated=updated,
        deleted=deleted,
        skipped=skipped,
        errors=errors,
    )


async def _upsert_sync_state_success(
    db: AsyncSession,
    device_id: uuid.UUID,
    record_type: str,
    token: str | None,
) -> None:
    """Atomic INSERT ... ON CONFLICT for the success path: writes the new
    token, stamps `last_synced_at`, resets `consecutive_failures`."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "id": uuid.uuid4(),
        "device_id": device_id,
        "record_type": record_type,
        "changes_token": token if token else None,
        "last_synced_at": now,
        "last_attempted_at": now,
        "consecutive_failures": 0,
    }
    stmt = pg_insert(DeviceSyncState).values(payload)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_device_sync_state_device_record",
        set_={
            "changes_token": stmt.excluded.changes_token,
            "last_synced_at": stmt.excluded.last_synced_at,
            "last_attempted_at": stmt.excluded.last_attempted_at,
            "consecutive_failures": 0,
            "updated_at": now,
        },
    )
    await db.execute(stmt)


async def _record_sync_failure(
    db: AsyncSession,
    device_id: uuid.UUID,
    record_type: str,
) -> int:
    """Failure path — bumps `consecutive_failures` and `last_attempted_at`
    WITHOUT touching `changes_token` (M2 fix: a single transient 500 used
    to clobber weeks of stable token state, forcing a 14-day bootstrap
    on the next sync). Returns the post-increment failure count so the
    caller can apply the H5 threshold."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "id": uuid.uuid4(),
        "device_id": device_id,
        "record_type": record_type,
        "changes_token": None,
        "last_synced_at": None,
        "last_attempted_at": now,
        "consecutive_failures": 1,
    }
    stmt = pg_insert(DeviceSyncState).values(payload)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_device_sync_state_device_record",
        set_={
            "last_attempted_at": now,
            "consecutive_failures": (
                DeviceSyncState.consecutive_failures + 1
            ),
            "updated_at": now,
        },
    ).returning(DeviceSyncState.consecutive_failures)
    result = await db.execute(stmt)
    row = result.one_or_none()
    if row is None:
        return 1
    value = row[0]
    return int(value) if value is not None else 1


async def list_sync_states(  # idor-ok: device ownership verified at endpoint layer (devices.py excluded from scan)
    db: AsyncSession,
    device_id: uuid.UUID,
) -> list[SyncStateEntry]:
    rows = (
        await db.execute(
            select(DeviceSyncState)
            .where(DeviceSyncState.device_id == device_id)
            .order_by(DeviceSyncState.record_type)
        )
    ).scalars().all()
    return [SyncStateEntry.model_validate(row) for row in rows]


async def replace_sync_states(
    db: AsyncSession,
    device_id: uuid.UUID,
    tokens: dict[str, str | None],
) -> list[SyncStateEntry]:
    """Standalone endpoint for the device to PUT a full bundle of tokens
    (e.g. after a permission re-grant where the orchestrator wants to
    re-init all record types)."""
    for record_type, token in tokens.items():
        await _upsert_sync_state_success(db, device_id, record_type, token)
    return await list_sync_states(db, device_id)


# Plan §H5 — only flip the device row to a hard "error" once a record
# type has failed this many times in a row. Anything below the threshold
# stays "partial" so transient network blips don't train users to ignore
# the only real "you should reconnect" banner.
_FAILURE_ERROR_THRESHOLD = 5


async def mark_failed(
    db: AsyncSession,
    device: ConnectedDevice,
    record_types: list[str],
    error_code: str,
) -> None:
    """Record a failed sync attempt. Bumps `consecutive_failures` per
    record type (without touching tokens — see M2 fix) and only flips
    `device.last_sync_status` to `'error'` once the threshold is crossed.
    The first few failures surface as `'partial'`."""
    if not record_types:
        # Nothing to attribute the failure to per record-type — still
        # surface it on the device row so the UI shows "partial."
        device.last_attempted_at = datetime.datetime.now(datetime.timezone.utc)
        if device.last_sync_status != "error":
            device.last_sync_status = "partial"
        device.last_sync_error = error_code
        return

    max_failures = 0
    for rt in record_types:
        count = await _record_sync_failure(db, device.id, rt)
        if count > max_failures:
            max_failures = count
    device.last_attempted_at = datetime.datetime.now(datetime.timezone.utc)
    device.last_sync_error = error_code
    if max_failures >= _FAILURE_ERROR_THRESHOLD:
        device.last_sync_status = "error"
    elif device.last_sync_status != "error":
        # Don't downgrade a previously-set hard error back to partial
        # before a recovery; keep "error" until a successful sync clears
        # it via `upsert_batch`.
        device.last_sync_status = "partial"
