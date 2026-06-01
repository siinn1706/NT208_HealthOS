"""Generic appointment asset service."""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.storage import (
    DEFAULT_GET_EXPIRY_S,
    delete_object,
    get_presigned_get_url,
    sha256_hex,
    upload_file,
)
from app.core.config import settings
from app.models.core import Appointment, AppointmentAsset, User
from app.services.upload_security import extension_for_mime, sanitize_response_filename

logger = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)
ALLOWED_KINDS = frozenset({"attachment", "lab_report"})


class AppointmentAssetTooLargeError(ValueError):
    pass


class AppointmentAssetMimeNotAllowed(ValueError):
    def __init__(self, mime: str):
        self.mime = mime
        super().__init__(f"Unsupported mime type: {mime}")


class AppointmentAssetKindNotAllowed(ValueError):
    def __init__(self, kind: str):
        self.kind = kind
        super().__init__(f"Unsupported appointment asset kind: {kind}")


class AppointmentAssetObjectDeleteError(RuntimeError):
    pass


def normalize_kind(kind: str | None) -> str:
    normalized = (kind or "attachment").strip().lower().replace("-", "_")
    if normalized not in ALLOWED_KINDS:
        raise AppointmentAssetKindNotAllowed(normalized)
    return normalized


async def _get_owned_appointment(
    db: AsyncSession,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> Optional[Appointment]:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


def _key_for(user_id: uuid.UUID, appointment_id: uuid.UUID, asset_id: uuid.UUID, kind: str, mime: str) -> str:
    ext = extension_for_mime(mime)
    return f"appointment-assets/{user_id}/{appointment_id}/{kind}/{asset_id}.{ext}"


async def list_assets(
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    *,
    kind: str | None = None,
) -> Optional[list[AppointmentAsset]]:
    normalized_kind = normalize_kind(kind) if kind else None
    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None
    filters = [
        AppointmentAsset.appointment_id == appointment_id,
        AppointmentAsset.deleted_at.is_(None),
    ]
    if normalized_kind:
        filters.append(AppointmentAsset.kind == normalized_kind)
    result = await db.execute(
        select(AppointmentAsset)
        .where(*filters)
        .order_by(AppointmentAsset.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def list_user_assets(
    db: AsyncSession,
    user: User,
    *,
    kind: str | None = None,
    limit: int = 100,
) -> list[AppointmentAsset]:
    normalized_kind = normalize_kind(kind) if kind else None
    filters = [
        Appointment.user_id == user.id,
        AppointmentAsset.deleted_at.is_(None),
    ]
    if normalized_kind:
        filters.append(AppointmentAsset.kind == normalized_kind)
    result = await db.execute(
        select(AppointmentAsset)
        .join(Appointment, Appointment.id == AppointmentAsset.appointment_id)
        .where(*filters)
        .order_by(AppointmentAsset.uploaded_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def upload_asset(
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    *,
    kind: str | None,
    file_bytes: bytes,
    mime_type: str,
    original_filename: Optional[str],
) -> Optional[AppointmentAsset]:
    normalized_kind = normalize_kind(kind)
    if len(file_bytes) > MAX_BYTES:
        raise AppointmentAssetTooLargeError(f"Maximum {MAX_BYTES} bytes; got {len(file_bytes)}.")
    if mime_type not in ALLOWED_MIME_TYPES:
        raise AppointmentAssetMimeNotAllowed(mime_type)

    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None

    asset_id = uuid.uuid4()
    bucket = settings.storage_bucket_docs
    key = _key_for(user.id, appointment_id, asset_id, normalized_kind, mime_type)
    digest = sha256_hex(file_bytes)

    asset = AppointmentAsset(
        id=asset_id,
        appointment_id=appointment_id,
        uploaded_by=user.id,
        kind=normalized_kind,
        bucket=bucket,
        key=key,
        mime_type=mime_type,
        size_bytes=len(file_bytes),
        sha256=digest,
        original_filename=sanitize_response_filename(original_filename, fallback="appointment-asset"),
    )
    db.add(asset)
    await db.flush()

    try:
        upload_file(bucket=bucket, key=key, file_bytes=file_bytes, content_type=mime_type)
    except Exception:
        try:
            delete_object(bucket, key)
        except Exception:
            logger.warning("Appointment asset upload failed and cleanup also failed for %s/%s", bucket, key)
        raise
    return asset


def delete_uploaded_object(bucket: str, key: str) -> None:
    delete_object(bucket, key)


async def get_asset(
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
) -> Optional[AppointmentAsset]:
    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None
    result = await db.execute(
        select(AppointmentAsset).where(
            AppointmentAsset.id == asset_id,
            AppointmentAsset.appointment_id == appointment_id,
            AppointmentAsset.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def soft_delete_asset(
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
) -> bool:
    asset = await get_asset(db, user, appointment_id, asset_id)
    if asset is None:
        return False
    try:
        delete_object(asset.bucket, asset.key)
    except Exception as exc:
        logger.warning("Appointment asset object delete failed; row left live: %s", asset.id)
        raise AppointmentAssetObjectDeleteError("Could not delete appointment asset object.") from exc
    asset.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    return True


def mint_signed_url(asset: AppointmentAsset, expires_s: int = DEFAULT_GET_EXPIRY_S) -> str:
    return get_presigned_get_url(
        bucket=asset.bucket,
        key=asset.key,
        expires_s=expires_s,
        response_content_disposition=(
            f'inline; filename="{sanitize_response_filename(asset.original_filename, fallback="appointment-asset")}"'
            if asset.original_filename
            else None
        ),
        response_content_type=asset.mime_type,
    )
