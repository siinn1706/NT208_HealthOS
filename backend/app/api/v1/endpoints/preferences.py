"""User preferences endpoints — GET/PATCH /preferences/me."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User, UserPreference
from app.schemas.preferences import UserPreferenceData, UserPreferenceResponse, UserPreferenceUpdate

router = APIRouter(prefix="/preferences", tags=["Preferences"])


def _default_prefs() -> UserPreferenceData:
    return UserPreferenceData(theme_mode="system", accent_color=None)


def _pref_to_data(pref: UserPreference) -> UserPreferenceData:
    return UserPreferenceData(theme_mode=pref.theme_mode, accent_color=pref.accent_color)


@router.get("/me", response_model=UserPreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferenceResponse:
    """Return current user preferences. Returns defaults if no row exists."""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    data = _pref_to_data(pref) if pref else _default_prefs()
    return UserPreferenceResponse(data=data)


@router.patch("/me", response_model=UserPreferenceResponse)
async def update_preferences(
    body: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferenceResponse:
    """Upsert user preferences. Only provided fields are updated."""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()

    if pref is None:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)

    await db.commit()
    await db.refresh(pref)
    return UserPreferenceResponse(data=_pref_to_data(pref))
