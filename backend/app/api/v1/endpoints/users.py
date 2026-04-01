"""Users endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import OnboardingStatusEnum, User, UserProfile
from app.schemas.auth import (
    CurrentUser,
    CurrentUserResponse,
    UserProfileUpdate,
)
from app.schemas.common import ErrorResponse

router = APIRouter(prefix="/users", tags=["Users"])


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
            accent_color=profile.accent_color if profile is not None else None,
            emergency_contacts=emergency_contacts,
            medical_info=medical_info,
        )
    )


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Return current user profile using the shared auth dependency."""
    return _to_current_user_response(current_user)


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
    # Get or create user profile
    profile = current_user.profile
    if profile is None:
        profile = UserProfile(user_id=current_user.id, full_name=current_user.display_name)
        db.add(profile)
        await db.flush()

    # Update profile fields
    update_data = body.model_dump(exclude_unset=True, exclude={"onboarding_completed"})

    for field, value in update_data.items():
        # Allow explicit null only for selected preference fields (e.g. accent_color reset).
        if value is None and field != "accent_color":
            continue

        # Handle emergency_contacts and medical_info (convert to dict for JSONB)
        if field in ("emergency_contacts", "medical_info"):
            setattr(
                profile,
                field,
                [item.model_dump() if hasattr(item, "model_dump") else item for item in value]
                if isinstance(value, list)
                else value,
            )
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
