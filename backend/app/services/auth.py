from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password
from app.models.core import User, UserProfile
from app.schemas.auth import OAuthProfile


async def get_or_create_user_from_oauth(
    profile: OAuthProfile,
    db: AsyncSession,
) -> User:
    """Find existing user by email or create a new one from OAuth profile."""
    result = await db.execute(
        select(User)
            .options(selectinload(User.profile))
            .where(User.email == profile.email)
    )
    user: Optional[User] = result.scalar_one_or_none()

    if user is None:
        # For OAuth users, store a random hashed password placeholder
        placeholder_password = hash_password(profile.provider_account_id)
        user = User(
            email=profile.email,
            display_name=profile.name,
            hashed_password=placeholder_password,
        )
        db.add(user)
        await db.flush()

        user_profile = UserProfile(
            user_id=user.id,
            full_name=profile.name,
            avatar_url=profile.avatar_url,
        )
        db.add(user_profile)
        # Keep relationship in-memory to avoid lazy load later
        user.profile = user_profile
    else:
        # Optionally keep basic info in sync
        user.display_name = profile.name
        if user.profile is not None:
            user.profile.full_name = profile.name
            user.profile.avatar_url = profile.avatar_url

    return user


def create_user_access_token(user: User) -> str:
    """Create JWT access token for a user."""
    return create_access_token(str(user.id))

