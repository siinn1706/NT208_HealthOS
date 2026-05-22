"""Users endpoints."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from redis.asyncio import Redis

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.adapters.storage import upload_file
from app.core.config import settings
from app.core.security import (
    get_current_user,
    get_current_user_for_restore,
    http_bearer,
)
from app.models.audit import AuditEventTypeEnum
from app.models.core import OnboardingStatusEnum, User, UserProfile
from app.schemas.auth import (
    CurrentUser,
    CurrentUserResponse,
    UserProfileUpdate,
)
from app.schemas.common import ErrorResponse
from app.schemas.data_export import (
    DataExportRequestDTO,
    DataExportRequestResponse,
    DataExportSignedUrlData,
    DataExportSignedUrlResponse,
)
from app.services import account_deletion as deletion_svc
from app.services import data_export as export_svc
from app.services.account_deletion import AlreadyPendingDeletion, IdentityCheckFailed
from app.services.audit import audit
from app.services.data_export import ExportRateLimited
from app.services.security_logging import log_resource_access_denied
from app.services.otp import (
    decrement_attempts,
    get_latest_active_otp,
    hash_otp_code,
    mark_otp_consumed,
)

router = APIRouter(prefix="/users", tags=["Users"])

_MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MiB
_ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _to_current_user_response(current_user: User) -> CurrentUserResponse:
    profile = current_user.profile
    gender_value = None
    if profile is not None and profile.gender is not None:
        # SQLAlchemy may return Enum or raw string depending on column/config state.
        gender_value = getattr(profile.gender, "value", profile.gender)

    emergency_contacts = profile.emergency_contacts if profile and profile.emergency_contacts else []
    medical_info = profile.medical_info if profile and profile.medical_info else {
        "allergies": None,
        "chronic_conditions": None,
        "current_medications": None,
        "notes": None,
    }

    return CurrentUserResponse(
        data=CurrentUser(
            id=str(current_user.id),
            email=current_user.email,
            username=current_user.username,
            display_name=current_user.display_name,
            avatar_url=profile.avatar_url if profile is not None else None,
            onboarding_status=current_user.onboarding_status,
            onboarding_completed_at=current_user.onboarding_completed_at.isoformat()
            if current_user.onboarding_completed_at
            else None,
            created_at=current_user.created_at.isoformat() if current_user.created_at else None,
            full_name=profile.full_name if profile is not None else current_user.display_name,
            date_of_birth=profile.date_of_birth.isoformat()
            if profile is not None and profile.date_of_birth
            else None,
            gender=gender_value,
            blood_type=profile.blood_type if profile is not None else None,
            height_cm=profile.height_cm if profile is not None else None,
            weight_kg=profile.weight_kg if profile is not None else None,
            phone=profile.phone if profile is not None else None,
            address=profile.address if profile is not None else None,
            emergency_contacts=emergency_contacts,
            medical_info=medical_info,
        )
    )


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Return current user profile using the shared auth dependency."""
    return _to_current_user_response(current_user)


@router.post(
    "/me/avatar",
    response_model=CurrentUserResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
)
async def upload_profile_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> CurrentUserResponse:
    """Upload a profile image to object storage and persist URL on ``user_profiles.avatar_url``."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_AVATAR_TYPE",
                "message": "Avatar must be JPEG, PNG, or WebP.",
            },
        )
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_FILE", "message": "Empty upload."},
        )
    if len(raw) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AVATAR_TOO_LARGE", "message": "Avatar must be at most 2 MiB."},
        )
    suffix_by_type = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    suffix = suffix_by_type.get(content_type, ".jpg")
    key = f"profile-avatars/{current_user.id}/{uuid.uuid4()}{suffix}"
    try:
        public_url = upload_file(
            settings.storage_bucket_meals,
            key,
            raw,
            content_type=content_type,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "STORAGE_UNAVAILABLE", "message": str(exc)},
        ) from exc

    url = public_url
    if len(url) > 512:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AVATAR_URL_TOO_LONG",
                "message": "Avatar URL exceeds 512 characters (check STORAGE_ENDPOINT / bucket path).",
            },
        )

    locked = await db.execute(
        select(UserProfile)
        .where(UserProfile.user_id == current_user.id)
        .with_for_update()
    )
    profile = locked.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(
            user_id=current_user.id,
            full_name=current_user.display_name,
            avatar_url=url,
        )
        db.add(profile)
    else:
        profile.avatar_url = url

    await db.commit()
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return _to_current_user_response(user)


@router.patch(
    "/me",
    response_model=CurrentUserResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def update_current_user_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """Update current user profile.

    If onboarding_completed is set to true, updates the user's onboarding status.
    """
    # Re-fetch the profile with a row-level lock to prevent last-write-wins race
    # conditions when the user submits two PATCH requests concurrently.
    locked = await db.execute(
        select(UserProfile)
        .where(UserProfile.user_id == current_user.id)
        .with_for_update()
    )
    profile = locked.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=current_user.id, full_name=current_user.display_name)
        db.add(profile)
        await db.flush()

    # Update profile fields
    update_data = body.model_dump(exclude_unset=True, exclude={"onboarding_completed"})

    for field, value in update_data.items():
        # Handle emergency_contacts and medical_info (convert to dict for JSONB)
        if field in ("emergency_contacts", "medical_info"):
            setattr(profile, field, [item.model_dump() if hasattr(item, "model_dump") else item for item in value] if isinstance(value, list) else value)
        else:
            setattr(profile, field, value)

    # Handle onboarding completion
    if body.onboarding_completed:
        current_user.onboarding_status = OnboardingStatusEnum.COMPLETED.value
        current_user.onboarding_completed_at = datetime.now(timezone.utc)
    elif current_user.onboarding_status == OnboardingStatusEnum.PENDING.value:
        current_user.onboarding_status = OnboardingStatusEnum.IN_PROGRESS.value

    await db.commit()
    await db.refresh(current_user)

    return _to_current_user_response(current_user)


# ─── B7 P8 — Account data export ─────────────────────────────────────────


@router.post(
    "/me/export",
    response_model=DataExportRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        401: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Request a downloadable archive of your account data (rate-limited 1 / 24h).",
)
async def request_data_export(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataExportRequestResponse:
    try:
        req = await export_svc.request_export(db, current_user.id)
    except ExportRateLimited as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMITED",
                "message": "An export request was already created in the last 24 hours.",
                "details": {"retry_after_s": exc.retry_after_s},
            },
        ) from exc
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.DATA_EXPORT_REQUESTED,
        user_id=current_user.id,
        request=request,
        details={"request_id": str(req.id)},
    )
    await db.commit()
    # Defer the heavy work to Celery so we can return 202 immediately.
    from app.tasks.data_export import build_user_export

    build_user_export.delay(str(current_user.id), str(req.id))
    return DataExportRequestResponse(data=DataExportRequestDTO.model_validate(req))


@router.get(
    "/me/export/{request_id}",
    response_model=DataExportRequestResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Poll the status of a data export job.",
)
async def get_data_export_status(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataExportRequestResponse:
    req = await export_svc.get_request(db, current_user.id, request_id)
    if req is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="users",
            resource_id=str(request_id),
            http_method="GET",
            route="/users/me/export/{request_id}",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Export request not found."},
        )
    return DataExportRequestResponse(data=DataExportRequestDTO.model_validate(req))


@router.get(
    "/me/export/{request_id}/download",
    response_model=DataExportSignedUrlResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        410: {"model": ErrorResponse},
    },
    summary="Mint a fresh 5-minute signed download URL for a completed export.",
)
async def get_data_export_download(
    request_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataExportSignedUrlResponse:
    from app.adapters.storage import DEFAULT_GET_EXPIRY_S
    from app.models.core import DataExportStatusEnum

    req = await export_svc.get_request(db, current_user.id, request_id)
    if req is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="users",
            resource_id=str(request_id),
            http_method="GET",
            route="/users/me/export/{request_id}/download",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Export request not found."},
        )
    if req.status != DataExportStatusEnum.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "EXPORT_NOT_READY", "message": "Export is not complete yet."},
        )
    now = datetime.now(timezone.utc)
    if req.expires_at is not None and req.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "EXPORT_EXPIRED", "message": "Download link has expired."},
        )
    url = export_svc.mint_signed_download(req)
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.DATA_EXPORT_DOWNLOADED,
        user_id=current_user.id,
        request=request,
        details={"request_id": str(req.id)},
    )
    await db.commit()
    return DataExportSignedUrlResponse(
        data=DataExportSignedUrlData(
            url=url,
            expires_in_s=DEFAULT_GET_EXPIRY_S,
            bytes=req.bytes or 0,
            expires_at=req.expires_at or now,
        )
    )


# ─── B7 P9 — Account soft delete + restore ───────────────────────────────


class DeleteAccountBody(BaseModel):
    """Identity proof for account deletion.

    `confirmation_email` must equal the user's email exactly (case-insensitive).
    Identity verification is one of:
      * `password` — required for users with `has_password=True`.
      * `otp_code` — required for OAuth-only users; verified against the
        most recent active OTP for `purpose='delete_account'`.
    """

    confirmation_email: EmailStr
    password: Optional[str] = Field(default=None, max_length=200)
    otp_code: Optional[str] = Field(default=None, min_length=6, max_length=6, pattern=r"^\d{6}$")
    reason: Optional[str] = Field(default=None, max_length=500)


@router.delete(
    "/me",
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        401: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Soft-delete the current account (30-day grace period).",
)
async def soft_delete_account(
    body: DeleteAccountBody,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict:
    # B7 P0-2 — OAuth-only users prove identity via OTP rather than password.
    # Verify the OTP here so the service layer stays pure.
    user_has_password = bool(getattr(current_user, "has_password", True))
    otp_verified = False
    if not user_has_password:
        if not body.otp_code:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "OTP_REQUIRED",
                    "message": (
                        "OAuth-only accounts must verify a one-time code emailed to them. "
                        "Request one via /v1/auth/request-otp with purpose='delete_account'."
                    ),
                },
            )
        otp_record = await get_latest_active_otp(
            db=db, email=current_user.email, purpose="delete_account"
        )
        if otp_record is None or otp_record.attempts_left <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "OTP_INVALID", "message": "OTP expired or invalid."},
            )
        if hash_otp_code(body.otp_code) != otp_record.code_hash:
            await decrement_attempts(db, otp_record)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "OTP_INVALID", "message": "OTP expired or invalid."},
            )
        await mark_otp_consumed(db, otp_record)
        otp_verified = True

    try:
        user = await deletion_svc.request_deletion(
            db=db,
            user=current_user,
            confirmation_email=body.confirmation_email,
            password=body.password,
            otp_verified=otp_verified,
            reason=body.reason,
        )
    except AlreadyPendingDeletion as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_PENDING_DELETION",
                "message": "An active deletion request already exists for this account.",
            },
        ) from exc
    except IdentityCheckFailed as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "IDENTITY_CHECK_FAILED", "message": str(exc)},
        ) from exc

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.ACCOUNT_DELETION_REQUESTED,
        user_id=user.id,
        request=request,
        details={"purge_at": user.purge_at.isoformat() if user.purge_at else None},
    )

    # In-app notification with the restore deep-link.
    from app.services import notifications as notif_svc
    from app.models.core import NotificationKindEnum

    await notif_svc.enqueue(
        db=db,
        user_id=user.id,
        title="Your account is scheduled for deletion",
        body=(
            "You can restore your account at any time within the next 30 days "
            "by signing in and choosing 'Restore account'."
        ),
        kind=NotificationKindEnum.ACCOUNT,
        link="/dashboard/settings",
    )

    # Revoke this caller's JWT so the response we are about to return is the
    # last successful one served on it.
    if credentials is not None:
        await deletion_svc.revoke_all_sessions(redis, credentials.credentials)
    await db.commit()

    return {
        "data": {
            "status": "pending_deletion",
            "purge_at": user.purge_at.isoformat() if user.purge_at else None,
        }
    }


@router.post(
    "/me/restore",
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Cancel a pending deletion (restore the account).",
)
async def restore_account(
    request: Request,
    user: User = Depends(get_current_user_for_restore),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if user.deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_PENDING_DELETION",
                "message": "Account is not in a deletion state.",
            },
        )
    await deletion_svc.restore(db, user)
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.ACCOUNT_DELETION_CANCELLED,
        user_id=user.id,
        request=request,
        details=None,
    )
    await db.commit()
    return {"data": {"status": "active"}}
