from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import case, func, literal, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password
from app.models.core import User, UserProfile
from app.schemas.auth import OAuthProfile
from app.services.account_status import is_active_ban


# ─── Constants ─────────────────────────────────────────────────────────────────
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
ESCALATING_LOCKOUT = [15, 30, 60, 120]  # minutes for consecutive lockouts


# Reserved usernames that cannot be used
RESERVED_USERNAMES = {
    "admin", "root", "system", "api", "healthos", "support", "help",
    "test", "testing", "user", "guest", "moderator", "superuser",
    "administrator", "root", "null", "undefined", "none", "webmaster"
}

# Username validation regex: 3-30 chars, alphanumeric + underscore, must start with letter
USERNAME_REGEX = re.compile(r"^[a-z][a-z0-9_]{2,29}$")


async def get_user_by_identifier(db: AsyncSession, identifier: str) -> Optional[User]:
    """Find a user by email or username.

    Args:
        db: Database session
        identifier: Email address or username

    Returns:
        User if found, None otherwise
    """
    normalized_identifier = identifier.lower().strip()

    if "@" in normalized_identifier:
        # Treat as email
        result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == normalized_identifier)
        )
    else:
        # Treat as username
        result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.username == normalized_identifier)
        )
    return result.scalar_one_or_none()


def validate_username(username: str) -> tuple[bool, str]:
    """Validate username format and availability.

    Args:
        username: Username to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not username:
        return False, "Username is required"

    normalized = username.lower().strip()

    if len(normalized) < 3:
        return False, "Username must be at least 3 characters"

    if len(normalized) > 30:
        return False, "Username must be at most 30 characters"

    if not USERNAME_REGEX.match(normalized):
        return False, "Username can only contain letters, numbers, and underscores, and must start with a letter"

    if normalized in RESERVED_USERNAMES:
        return False, "This username is reserved"

    return True, ""


async def check_username_availability(db: AsyncSession, username: str) -> bool:
    """Check if a username is available.

    Args:
        db: Database session
        username: Username to check

    Returns:
        True if available, False if taken
    """
    normalized = username.lower().strip()

    # Validate format first
    is_valid, _ = validate_username(normalized)
    if not is_valid:
        return False

    result = await db.execute(
        select(User).where(User.username == normalized)
    )
    return result.scalar_one_or_none() is None


async def check_email_availability(db: AsyncSession, email: str) -> bool:
    """Check if an email is available.

    Args:
        db: Database session
        email: Email to check

    Returns:
        True if available, False if taken
    """
    normalized = email.lower().strip()
    if not normalized:
        return False

    result = await db.execute(
        select(User.id).where(func.lower(User.email) == normalized)
    )
    return result.scalar_one_or_none() is None


class UserPendingDeletion(Exception):
    """Raised when an OAuth sign-in resolves to a soft-deleted user.

    The endpoint catches this and returns 403 with `ACCOUNT_PENDING_DELETION`
    so the BFF can route the user to a "restore your account" prompt instead
    of minting a JWT they can't use anyway (see B7 review P0-3).
    """

    def __init__(self, user_id: uuid.UUID, purge_at):
        self.user_id = user_id
        self.purge_at = purge_at
        super().__init__("Account is pending deletion.")


class UserBanned(Exception):
    def __init__(self, user_id: uuid.UUID, banned_until):
        self.user_id = user_id
        self.banned_until = banned_until
        super().__init__("Account is banned.")


async def get_or_create_user_from_oauth(
    profile: OAuthProfile,
    db: AsyncSession,
) -> User:
    """Resolve an OAuth profile to an internal User and ensure a link row.

    Lookup order:
      1. `oauth_accounts(provider, provider_account_id)` — fastest, exact identity.
      2. `users.email` — legacy users + email-based auto-link (the OAuth provider
         is trusted to have email-verified the account; ensured by callers).
      3. Create a new user.

    Always upserts the `oauth_accounts` row and refreshes `last_used_at` so the
    profile UI can show "last sign-in via Google · 2h ago".
    """
    from app.models.core import OAuthAccount

    # 1. Look up by provider account id (most reliable).
    link_result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == profile.provider,
            OAuthAccount.provider_account_id == profile.provider_account_id,
        )
    )
    link: Optional[OAuthAccount] = link_result.scalar_one_or_none()

    user: Optional[User] = None
    if link is not None:
        user_result = await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == link.user_id)
        )
        user = user_result.scalar_one_or_none()

    if user is None:
        # 2. Fall back to email match (legacy users + first-time link by email).
        result = await db.execute(
            select(User)
                .options(selectinload(User.profile))
                .where(func.lower(User.email) == profile.email.lower())
        )
        user = result.scalar_one_or_none()

    # B7 review P0-3 — soft-deleted users must NOT receive a fresh JWT via
    # OAuth re-sign-in during their grace period. Surface a typed exception so
    # the endpoint can route the user to a "restore your account" prompt.
    if user is not None and user.deleted_at is not None:
        raise UserPendingDeletion(user_id=user.id, purge_at=user.purge_at)

    if user is not None and is_active_ban(user):
        raise UserBanned(user_id=user.id, banned_until=user.banned_until)

    if user is None:
        # 3. Create a fresh user.
        # `hashed_password` carries an unguessable bcrypt placeholder so the
        # column stays NOT NULL; the `has_password=False` flag is the
        # authoritative "this user has no password they actually know" signal.
        placeholder_password = hash_password(profile.provider_account_id)
        user = User(
            email=profile.email,
            display_name=profile.name,
            hashed_password=placeholder_password,
            has_password=False,
        )
        db.add(user)
        await db.flush()

        user_profile = UserProfile(
            user_id=user.id,
            full_name=profile.name,
            avatar_url=profile.avatar_url,
        )
        db.add(user_profile)
        await db.flush()
        user.profile = user_profile
    else:
        # Optionally keep basic info in sync (only when not stomping on a real user-set value).
        user.display_name = profile.name
        if user.profile is not None:
            user.profile.full_name = profile.name
            user.profile.avatar_url = profile.avatar_url
        else:
            # Profile row missing for existing user — create it with OAuth data.
            user_profile = UserProfile(
                user_id=user.id,
                full_name=profile.name,
                avatar_url=profile.avatar_url,
            )
            db.add(user_profile)
            await db.flush()
            user.profile = user_profile

    # Upsert the link row.
    if link is None:
        link = OAuthAccount(
            user_id=user.id,
            provider=profile.provider,
            provider_account_id=profile.provider_account_id,
            email=profile.email,
            display_name=profile.name,
            avatar_url=profile.avatar_url,
            last_used_at=datetime.now(timezone.utc),
        )
        db.add(link)
        await db.flush()
    else:
        link.email = profile.email
        link.display_name = profile.name
        link.avatar_url = profile.avatar_url
        link.last_used_at = datetime.now(timezone.utc)
        await db.flush()

    return user


def create_user_access_token(user: User) -> str:
    """Create JWT access token for a user."""
    return create_access_token(str(user.id))


# ─── Account Lockout Functions ──────────────────────────────────────────────────
async def check_account_lockout(user: User) -> bool:
    """Check if account is currently locked.

    Args:
        user: The user to check

    Returns:
        True if account is locked, False otherwise
    """
    if user.locked_until is None:
        return False

    if datetime.now(timezone.utc) > user.locked_until:
        # Lockout expired, reset counter (will be done in record_failed_login)
        return False

    return True


async def record_failed_login(db: AsyncSession, user: User) -> None:
    """Record failed login attempt and apply lockout if threshold reached.

    Uses a database-level atomic increment (UPDATE … SET failed_login_attempts =
    failed_login_attempts + 1) to prevent a race where two concurrent failed
    logins both read the same counter and each increment to the same value,
    effectively losing one count.

    The lockout decision is also computed in SQL (using the post-increment counter)
    so that concurrent requests don't overwrite a lockout with a stale in-memory value.
    """
    now = datetime.now(timezone.utc)
    new_attempts_expr = User.failed_login_attempts + 1

    # Build a SQL CASE that maps each post-increment threshold to a lockout timestamp.
    # Thresholds: 5 → index 0, 10 → index 1, 15 → index 2, 20+ → index 3.
    lockout_cases = []
    for i, minutes in enumerate(ESCALATING_LOCKOUT):
        threshold = MAX_FAILED_ATTEMPTS * (i + 1)
        lockout_ts = now + timedelta(minutes=minutes)
        lockout_cases.append(
            (new_attempts_expr == threshold, literal(lockout_ts))
        )
    # For counts above the last explicit threshold keep the most aggressive lockout.
    max_lockout_ts = now + timedelta(minutes=ESCALATING_LOCKOUT[-1])
    locked_until_expr = case(
        *lockout_cases,
        else_=case(
            (new_attempts_expr > MAX_FAILED_ATTEMPTS * len(ESCALATING_LOCKOUT), literal(max_lockout_ts)),
            else_=User.locked_until,
        ),
    )

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            failed_login_attempts=new_attempts_expr,
            locked_until=locked_until_expr,
        )
    )

    # Refresh in-memory object from DB so callers see the authoritative state.
    await db.refresh(user)
    await db.commit()


async def reset_failed_login_attempts(db: AsyncSession, user: User) -> None:
    """Reset failed login counter on successful login.

    Args:
        db: Database session
        user: The user who logged in successfully
    """
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(failed_login_attempts=0, locked_until=None)
    )
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

