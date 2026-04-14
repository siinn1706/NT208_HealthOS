"""Users endpoints."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.database import get_db
from app.adapters.storage import upload_file
from app.core.config import settings
from app.core.security import get_current_user
from app.models.core import OnboardingStatusEnum, User, UserProfile
from app.schemas.auth import (
    CurrentUser,
    CurrentUserResponse,
    UserProfileUpdate,
)
from app.schemas.common import ErrorResponse

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
