"""Generic appointment asset endpoints."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.storage import DEFAULT_GET_EXPIRY_S
from app.core.security import get_current_user
from app.models.audit import AuditEventTypeEnum
from app.models.core import User
from app.schemas.appointment_assets import (
    AppointmentAssetDTO,
    AppointmentAssetKind,
    AppointmentAssetListResponse,
    AppointmentAssetResponse,
    SignedAppointmentAssetUrlData,
    SignedAppointmentAssetUrlResponse,
)
from app.schemas.common import ErrorResponse
from app.services import appointment_assets as asset_svc
from app.services.appointment_assets import (
    AppointmentAssetKindNotAllowed,
    AppointmentAssetMimeNotAllowed,
    AppointmentAssetObjectDeleteError,
    AppointmentAssetTooLargeError,
)
from app.services.audit import audit
from app.services.security_logging import log_resource_access_denied
from app.services.upload_security import UploadTooLargeError, detect_document_mime, read_upload_bounded

router = APIRouter(tags=["Appointment Assets"])


def _unsupported_kind(exc: AppointmentAssetKindNotAllowed) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "UNSUPPORTED_ASSET_KIND",
            "message": "Only attachment and lab_report are accepted.",
            "details": {"kind": exc.kind},
        },
    )


@router.get(
    "/appointment-assets",
    response_model=AppointmentAssetListResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="List current user's appointment assets",
)
async def list_user_appointment_assets(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    kind: AppointmentAssetKind | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
) -> AppointmentAssetListResponse:
    try:
        items = await asset_svc.list_user_assets(db=db, user=current_user, kind=kind, limit=limit)
    except AppointmentAssetKindNotAllowed as exc:
        raise _unsupported_kind(exc) from exc
    return AppointmentAssetListResponse(
        data=[AppointmentAssetDTO.model_validate(item) for item in items]
    )


@router.get(
    "/appointments/{appointment_id}/assets",
    response_model=AppointmentAssetListResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="List appointment asset metadata",
)
async def list_appointment_assets(
    appointment_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    kind: AppointmentAssetKind | None = Query(default=None),
) -> AppointmentAssetListResponse:
    try:
        items = await asset_svc.list_assets(db=db, user=current_user, appointment_id=appointment_id, kind=kind)
    except AppointmentAssetKindNotAllowed as exc:
        raise _unsupported_kind(exc) from exc
    if items is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="appointment-assets",
            resource_id=str(appointment_id),
            http_method="GET",
            route="/appointments/{appointment_id}/assets",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Appointment not found."},
        )
    return AppointmentAssetListResponse(
        data=[AppointmentAssetDTO.model_validate(item) for item in items]
    )


@router.post(
    "/appointments/{appointment_id}/assets",
    response_model=AppointmentAssetResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
    },
    summary="Upload an appointment asset (PDF / PNG / JPEG / WEBP, <=10 MiB)",
)
async def upload_appointment_asset(
    appointment_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    kind: AppointmentAssetKind = Form(default=AppointmentAssetKind.ATTACHMENT),
) -> AppointmentAssetResponse:
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

    mime_type = detect_document_mime(file_bytes[:32], file.content_type)
    try:
        asset = await asset_svc.upload_asset(
            db=db,
            user=current_user,
            appointment_id=appointment_id,
            kind=kind,
            file_bytes=file_bytes,
            mime_type=mime_type,
            original_filename=file.filename,
        )
    except AppointmentAssetKindNotAllowed as exc:
        raise _unsupported_kind(exc) from exc
    except AppointmentAssetTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": str(exc)},
        ) from exc
    except AppointmentAssetMimeNotAllowed as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "UNSUPPORTED_MEDIA_TYPE",
                "message": "Only PDF, PNG, JPEG, and WEBP are accepted.",
            },
        ) from exc

    if asset is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="appointment-assets",
            resource_id=str(appointment_id),
            http_method="POST",
            route="/appointments/{appointment_id}/assets",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Appointment not found."},
        )

    bucket = asset.bucket
    key = asset.key
    try:
        await audit(
            db=db,
            event_type=AuditEventTypeEnum.APPOINTMENT_ASSET_UPLOADED,
            user_id=current_user.id,
            request=request,
            details={
                "appointment_id": str(appointment_id),
                "asset_id": str(asset.id),
                "kind": asset.kind,
                "mime_type": asset.mime_type,
                "size_bytes": asset.size_bytes,
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()
        try:
            asset_svc.delete_uploaded_object(bucket, key)
        except Exception:
            pass
        raise
    return AppointmentAssetResponse(data=AppointmentAssetDTO.model_validate(asset))


@router.get(
    "/appointments/{appointment_id}/assets/{asset_id}/url",
    response_model=SignedAppointmentAssetUrlResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Mint a short-lived signed download URL for one appointment asset",
)
async def get_appointment_asset_url(
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SignedAppointmentAssetUrlResponse:
    asset = await asset_svc.get_asset(db=db, user=current_user, appointment_id=appointment_id, asset_id=asset_id)
    if asset is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="appointment-assets",
            resource_id=str(asset_id),
            http_method="GET",
            route="/appointments/{appointment_id}/assets/{asset_id}/url",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Asset not found."},
        )
    url = asset_svc.mint_signed_url(asset, expires_s=DEFAULT_GET_EXPIRY_S)
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.APPOINTMENT_ASSET_DOWNLOADED,
        user_id=current_user.id,
        request=request,
        details={"appointment_id": str(appointment_id), "asset_id": str(asset_id), "kind": asset.kind},
    )
    await db.commit()
    return SignedAppointmentAssetUrlResponse(
        data=SignedAppointmentAssetUrlData(
            url=url,
            expires_in_s=DEFAULT_GET_EXPIRY_S,
            mime_type=asset.mime_type,
            original_filename=asset.original_filename,
        )
    )


@router.delete(
    "/appointments/{appointment_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Soft-delete an appointment asset",
)
async def delete_appointment_asset(
    appointment_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        removed = await asset_svc.soft_delete_asset(db=db, user=current_user, appointment_id=appointment_id, asset_id=asset_id)
    except AppointmentAssetObjectDeleteError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "STORAGE_DELETE_FAILED",
                "message": "Could not delete appointment asset from storage. Try again.",
            },
        ) from exc
    if not removed:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="appointment-assets",
            resource_id=str(asset_id),
            http_method="DELETE",
            route="/appointments/{appointment_id}/assets/{asset_id}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Asset not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.APPOINTMENT_ASSET_DELETED,
        user_id=current_user.id,
        request=request,
        details={"appointment_id": str(appointment_id), "asset_id": str(asset_id)},
    )
    await db.commit()
