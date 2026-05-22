"""Prescription assets service (B7 P4).

Upload, list, signed-URL mint, and soft-delete operations. Authorization is
"appointment owner only" today; future doctor role would extend this without
touching the call sites by adding a permission helper here.
"""
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
from app.models.core import Appointment, PrescriptionAsset, User

logger = logging.getLogger(__name__)


# Hard limits — kept here so endpoints stay slim.
MAX_BYTES = 10 * 1024 * 1024  # 10 MiB matches the multipart proxy ceiling.
ALLOWED_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)


class AssetTooLargeError(ValueError):
    pass


class AssetMimeNotAllowed(ValueError):
    def __init__(self, mime: str):
        self.mime = mime
        super().__init__(f"Unsupported mime type: {mime}")


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


def _key_for(user_id: uuid.UUID, appointment_id: uuid.UUID, asset_id: uuid.UUID, mime: str) -> str:
    ext = {
        "application/pdf": "pdf",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
    }.get(mime, "bin")
    return f"prescriptions/{user_id}/{appointment_id}/{asset_id}.{ext}"


async def list_assets(  # idor-ok: ownership checked via _get_owned_appointment(db, user.id, appointment_id) inside body
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
) -> Optional[list[PrescriptionAsset]]:
    """Return all non-deleted assets for an appointment owned by `user`.

    Returns None when the appointment doesn't exist or isn't owned (so the
    caller can return 404 / 403 — we deliberately don't leak existence).
    """
    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None
    result = await db.execute(
        select(PrescriptionAsset)
        .where(
            PrescriptionAsset.appointment_id == appointment_id,
            PrescriptionAsset.deleted_at.is_(None),
        )
        .order_by(PrescriptionAsset.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def upload_asset(
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    *,
    file_bytes: bytes,
    mime_type: str,
    original_filename: Optional[str],
) -> Optional[PrescriptionAsset]:
    if len(file_bytes) > MAX_BYTES:
        raise AssetTooLargeError(f"Maximum {MAX_BYTES} bytes; got {len(file_bytes)}.")
    if mime_type not in ALLOWED_MIME_TYPES:
        raise AssetMimeNotAllowed(mime_type)

    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None

    asset_id = uuid.uuid4()
    bucket = settings.storage_bucket_docs
    key = _key_for(user.id, appointment_id, asset_id, mime_type)
    digest = sha256_hex(file_bytes)

    upload_file(bucket=bucket, key=key, file_bytes=file_bytes, content_type=mime_type)

    asset = PrescriptionAsset(
        id=asset_id,
        appointment_id=appointment_id,
        uploaded_by=user.id,
        bucket=bucket,
        key=key,
        mime_type=mime_type,
        size_bytes=len(file_bytes),
        sha256=digest,
        original_filename=original_filename,
    )
    db.add(asset)
    await db.flush()
    return asset


async def get_asset(  # idor-ok: ownership checked via _get_owned_appointment(db, user.id, appointment_id) inside body
    db: AsyncSession,
    user: User,
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
) -> Optional[PrescriptionAsset]:
    appt = await _get_owned_appointment(db, user.id, appointment_id)
    if appt is None:
        return None
    result = await db.execute(
        select(PrescriptionAsset).where(
            PrescriptionAsset.id == asset_id,
            PrescriptionAsset.appointment_id == appointment_id,
            PrescriptionAsset.deleted_at.is_(None),
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
    asset.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    # Best-effort: also drop the object so the bytes are gone within a beat;
    # if delete fails (e.g. MinIO blip) the row is still soft-deleted and a
    # follow-up janitor can sweep.
    try:
        delete_object(asset.bucket, asset.key)
    except Exception:
        logger.warning("Soft-deleted asset %s but object delete failed", asset.id)
    return True


def mint_signed_url(asset: PrescriptionAsset, expires_s: int = DEFAULT_GET_EXPIRY_S) -> str:
    """Always re-issued — never persisted, never logged."""
    return get_presigned_get_url(
        bucket=asset.bucket,
        key=asset.key,
        expires_s=expires_s,
        response_content_disposition=(
            f'inline; filename="{asset.original_filename}"' if asset.original_filename else None
        ),
        response_content_type=asset.mime_type,
    )
