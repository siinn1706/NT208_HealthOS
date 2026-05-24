"""Create local admin account(s) from environment variables and grant the admin RBAC role.

Usage (from repo root, with venv activated):
    cd backend
    SEED_ADMIN_EMAIL=admin@healthos.local \\
    SEED_ADMIN_PASSWORD='change-me' \\
    python seed_admin.py

Multi-email:
    SEED_ADMIN_EMAILS='a@x.com,b@x.com' SEED_ADMIN_PASSWORD='change-me' python seed_admin.py

The password is required only when at least one email does not have an existing user row.
It is never printed to stdout or stderr.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.core import User, UserProfile
from app.services.rbac import DEFAULT_ROLE_ADMIN, ensure_default_roles_and_permissions, grant_role
from app.services.auth import RESERVED_USERNAMES


def _env_value(name: str, default: str | None = None) -> str | None:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip()
    return value or default


def _collect_emails() -> list[str]:
    """Merge SEED_ADMIN_EMAIL + SEED_ADMIN_EMAILS, lowercase, dedupe."""
    singles = _env_value("SEED_ADMIN_EMAIL") or ""
    multi = _env_value("SEED_ADMIN_EMAILS") or ""
    raw = [e.strip() for e in f"{singles},{multi}".split(",") if e.strip()]
    seen: set[str] = set()
    result: list[str] = []
    for email in raw:
        lower = email.lower()
        if lower not in seen:
            seen.add(lower)
            result.append(lower)
    return result


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "_", text.lower()).strip("_")[:50] or "user"


async def _username_exists(db, candidate: str) -> bool:
    result = await db.execute(select(User.id).where(User.username == candidate).limit(1))
    return result.scalar() is not None


async def _username_from_email_safe(db, email: str) -> str:
    """Generate a unique, non-reserved username from an email address."""
    base = _slug(email.split("@", 1)[0])
    if base in RESERVED_USERNAMES:
        base = f"{base}_seed"
    candidate = base
    if not await _username_exists(db, candidate):
        return candidate
    # First collision: use sha1 suffix of full email
    sha_suffix = hashlib.sha1(email.encode()).hexdigest()[:6]
    candidate = f"{base}_{sha_suffix}"
    suffix = 2
    while await _username_exists(db, candidate):
        candidate = f"{base}_{suffix}"
        suffix += 1
    return candidate


async def seed() -> None:
    emails = _collect_emails()
    if not emails:
        print("[seed] No SEED_ADMIN_EMAIL or SEED_ADMIN_EMAILS provided; nothing to seed.")
        return

    password = _env_value("SEED_ADMIN_PASSWORD")

    async with AsyncSessionLocal() as db:
        try:
            await ensure_default_roles_and_permissions(db, commit=False)

            for email in emails:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()

                if user is None:
                    if not password:
                        print(
                            f"[seed] SEED_ADMIN_PASSWORD required to create '{email}'; skipping.",
                            file=sys.stderr,
                        )
                        raise SystemExit(1)
                    username = await _username_from_email_safe(db, email)
                    user = User(
                        email=email,
                        username=username,
                        display_name=email.split("@", 1)[0],
                        hashed_password=hash_password(password),
                        has_password=True,
                    )
                    db.add(user)
                    await db.flush()
                    db.add(UserProfile(user_id=user.id, full_name=user.display_name))
                    created = True
                else:
                    # Ensure existing users have a profile row (mirrors OAuth provisioning).
                    profile_result = await db.execute(
                        select(UserProfile).where(UserProfile.user_id == user.id)
                    )
                    if profile_result.scalar_one_or_none() is None:
                        db.add(UserProfile(
                            user_id=user.id,
                            full_name=user.display_name or email.split("@", 1)[0],
                        ))
                    created = False

                await grant_role(db, user.id, DEFAULT_ROLE_ADMIN)
                print(f"[seed] granted admin to '{email}' ({'created' if created else 'existing'}).")

            await db.commit()
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed())
