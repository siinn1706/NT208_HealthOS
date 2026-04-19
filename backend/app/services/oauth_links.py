"""B7 P3 — OAuth linked-accounts service.

Distinct from sign-in (handled by `services/auth.get_or_create_user_from_oauth`).
This service powers the **authenticated** "Settings → Linked Accounts" flow:

  * `list_links` — what providers does this user already have attached?
  * `attach_link` — called by the BFF after the user re-authorizes a provider
    while logged in. Refuses with 409 if the provider account is already
    linked to a different user (security: never silently steal an account).
  * `unlink` — refuses if it would leave the user with no way to sign in
    (no password set + no other linked provider).

All write paths are audit-logged via `app.services.audit`.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import OAuthAccount, User


class OAuthLinkConflict(Exception):
    """Raised when a provider account is already linked to a different user."""

    def __init__(self, provider: str, owning_user_id: uuid.UUID):
        self.provider = provider
        self.owning_user_id = owning_user_id
        super().__init__(f"{provider} account is already linked to another user.")


class LastSignInMethodError(Exception):
    """Raised when unlinking would orphan the user (no password + no other link)."""


async def list_links(db: AsyncSession, user_id: uuid.UUID) -> list[OAuthAccount]:
    result = await db.execute(
        select(OAuthAccount)
        .where(OAuthAccount.user_id == user_id)
        .order_by(OAuthAccount.linked_at.desc())
    )
    return list(result.scalars().all())


async def get_link(
    db: AsyncSession,
    user_id: uuid.UUID,
    link_id: uuid.UUID,
) -> Optional[OAuthAccount]:
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.id == link_id,
            OAuthAccount.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def attach_link(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    provider: str,
    provider_account_id: str,
    email: str,
    display_name: str,
    avatar_url: Optional[str] = None,
) -> tuple[OAuthAccount, bool]:
    """Attach a provider to an existing user.

    Returns (link, created) — `created=False` means the link already existed
    and we simply refreshed the snapshot.

    Raises:
        OAuthLinkConflict: provider account is already linked to a different user.
    """
    # Conflict guard: same provider+provider_account_id linked to a *different* user?
    existing = (
        await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_account_id == provider_account_id,
            )
        )
    ).scalar_one_or_none()

    if existing is not None and existing.user_id != user_id:
        raise OAuthLinkConflict(provider=provider, owning_user_id=existing.user_id)

    if existing is not None:
        # Idempotent re-link — refresh metadata and return.
        existing.email = email
        existing.display_name = display_name
        existing.avatar_url = avatar_url
        existing.last_used_at = datetime.datetime.now(datetime.timezone.utc)
        await db.flush()
        return existing, False

    link = OAuthAccount(
        user_id=user_id,
        provider=provider,
        provider_account_id=provider_account_id,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
        last_used_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(link)
    await db.flush()
    return link, True


async def unlink(
    db: AsyncSession,
    user: User,
    link_id: uuid.UUID,
) -> bool:
    """Detach a linked provider.

    Raises:
        LastSignInMethodError: user has no password set and this is the only
            remaining linked provider — unlinking would orphan the account.
    """
    link = await get_link(db=db, user_id=user.id, link_id=link_id)
    if link is None:
        return False

    # Authoritative check: `users.has_password` is set to True only after a
    # real password-setting flow (email/password signup, password reset).
    # The legacy heuristic that always returned False has been removed.
    other_links_count = (
        await db.execute(
            select(OAuthAccount.id).where(
                OAuthAccount.user_id == user.id,
                OAuthAccount.id != link_id,
            )
        )
    ).all()

    has_password_login = bool(getattr(user, "has_password", True))

    if not has_password_login and len(other_links_count) == 0:
        raise LastSignInMethodError()

    await db.delete(link)
    await db.flush()
    return True
