"""Prescription assets endpoints (B7 P4).

  * `POST   /v1/appointments/{id}/prescription/assets`           upload (multipart)
  * `GET    /v1/appointments/{id}/prescription/assets`           list metadata only
  * `GET    /v1/appointments/{id}/prescription/assets/{aid}/url` mint a 5-min signed GET
  * `DELETE /v1/appointments/{id}/prescription/assets/{aid}`     soft delete

Signed URLs are minted **only** on the `/url` endpoint and never embedded in
the list response; they are also never logged.
"""
from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.storage import DEFAULT_GET_EXPIRY_S
from app.core.security import get_current_user
from app.models.audit import AuditEventTypeEnum
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.prescriptions import (
    PrescriptionAssetDTO,
    PrescriptionAssetListResponse,
    PrescriptionAssetResponse,
    SignedAssetUrlData,
    SignedAssetUrlResponse,
)
from app.services import prescription_assets as asset_svc
from app.services.audit import audit
from app.services.prescription_assets import AssetMimeNotAllowed, AssetTooLargeError
from app.services.upload_security import (
    UploadTooLargeError,
    detect_prescription_mime,
    read_upload_bounded,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["Prescriptions"])


@router.post(
    "/{appointment_id}/prescription/assets",
    response_model=PrescriptionAssetResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
    },
    summary="Upload a prescription file (PDF / PNG / JPEG / WEBP, ≤10 MiB)",
)
async def upload_prescription_asset(
    appointment_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> PrescriptionAssetResponse:
    try:
        file_bytes = await read_upload_bounded(file, asset_svc.MAX_BYTES)
    except UploadTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": str(exc)},
        ) from exc
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_FILE", "message": "Uploaded file is empty."},
        )

    mime_type = detect_prescription_mime(file_bytes[:32], file.content_type)

    try:
        asset = await asset_svc.upload_asset(
            db=db,
            user=current_user,
            appointment_id=appointment_id,
            file_bytes=file_bytes,
            mime_type=mime_type,
            original_filename=file.filename,
        )
    except AssetTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": str(exc)},
        ) from exc
    except AssetMimeNotAllowed as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "UNSUPPORTED_MEDIA_TYPE",
                "message": "Only PDF, PNG, JPEG, and WEBP are accepted.",
            },
        ) from exc

    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Appointment not found."},
        )

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.PRESCRIPTION_ASSET_UPLOADED,
        user_id=current_user.id,
        request=request,
        details={
            "appointment_id": str(appointment_id),
            "asset_id": str(asset.id),
            "mime_type": asset.mime_type,
            "size_bytes": asset.size_bytes,
        },
    )
    await db.commit()
    return PrescriptionAssetResponse(data=PrescriptionAssetDTO.model_validate(asset))


@router.get(
    "/{appointment_id}/prescription/assets",
    response_model=PrescriptionAssetListResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="List prescription file metadata (no signed URLs)",
)
async def list_prescription_assets(
    appointment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PrescriptionAssetListResponse:
    items = await asset_svc.list_assets(db=db, user=current_user, appointment_id=appointment_id)
    if items is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Appointment not found."},
        )
    return PrescriptionAssetListResponse(
        data=[PrescriptionAssetDTO.model_validate(item) for item in items]
    )


@router.get(
    "/{appointment_id}/prescription/assets/{asset_id}/url",
    response_model=SignedAssetUrlResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Mint a short-lived signed download URL for one asset",
)
async def get_prescription_asset_url(
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SignedAssetUrlResponse:
    asset = await asset_svc.get_asset(
        db=db, user=current_user, appointment_id=appointment_id, asset_id=asset_id
    )
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Asset not found."},
        )
    url = asset_svc.mint_signed_url(asset, expires_s=DEFAULT_GET_EXPIRY_S)
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.PRESCRIPTION_ASSET_DOWNLOADED,
        user_id=current_user.id,
        request=request,
        details={"appointment_id": str(appointment_id), "asset_id": str(asset_id)},
    )
    await db.commit()
    return SignedAssetUrlResponse(
        data=SignedAssetUrlData(
            url=url,
            expires_in_s=DEFAULT_GET_EXPIRY_S,
            mime_type=asset.mime_type,
            original_filename=asset.original_filename,
        )
    )


@router.delete(
    "/{appointment_id}/prescription/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Soft-delete a prescription asset",
)
async def delete_prescription_asset(
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    removed = await asset_svc.soft_delete_asset(
        db=db, user=current_user, appointment_id=appointment_id, asset_id=asset_id
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Asset not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.PRESCRIPTION_ASSET_DELETED,
        user_id=current_user.id,
        request=request,
        details={"appointment_id": str(appointment_id), "asset_id": str(asset_id)},
    )
    await db.commit()
