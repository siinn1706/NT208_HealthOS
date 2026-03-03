"""Users endpoints."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.core import User
from app.schemas.auth import CurrentUser, CurrentUserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Return current user profile using the shared auth dependency."""
    return CurrentUserResponse(
        data=CurrentUser(
            id=str(current_user.id),
            email=current_user.email,
            display_name=current_user.display_name,
            avatar_url=current_user.profile.avatar_url
            if current_user.profile is not None
            else None,
        )
    )
