"""Create a local demo/admin account from environment variables.

Usage (from repo root, with venv activated):
    cd backend
    SEED_ADMIN_EMAIL=admin@healthos.local \
    SEED_ADMIN_PASSWORD='change-me' \
    SEED_ADMIN_DISPLAY_NAME='Admin Test' \
    python seed_admin.py

The password is required and is never printed.
"""
import asyncio
import sys
import os
import re

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.core import User, UserProfile


DEFAULT_SEED_EMAIL = "admin@healthos.local"
DEFAULT_SEED_DISPLAY_NAME = "Admin Test"


def _env_value(name: str, default: str | None = None) -> str | None:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip()
    return value or default


def _username_from_email(email: str) -> str:
    local = email.split("@", 1)[0].lower()
    username = re.sub(r"[^a-z0-9_]+", "_", local).strip("_")
    return username[:50] or "admin"


async def seed() -> None:
    email = _env_value("SEED_ADMIN_EMAIL", DEFAULT_SEED_EMAIL)
    display_name = _env_value("SEED_ADMIN_DISPLAY_NAME", DEFAULT_SEED_DISPLAY_NAME)
    password = _env_value("SEED_ADMIN_PASSWORD")

    if not email:
        print("[seed] SEED_ADMIN_EMAIL is missing; nothing to seed.", file=sys.stderr)
        return

    if not password:
        print(
            "[seed] SEED_ADMIN_PASSWORD is required; refusing to create an account without a password.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.email == email))
            existing: User | None = result.scalar_one_or_none()

            if existing:
                print(f"[seed] User '{email}' already exists; skipping.")
                return

            user = User(
                email=email,
                username=_username_from_email(email),
                display_name=display_name or DEFAULT_SEED_DISPLAY_NAME,
                hashed_password=hash_password(password),
                has_password=True,
            )
            db.add(user)
            await db.flush()

            profile = UserProfile(user_id=user.id, full_name=user.display_name)
            db.add(profile)
            await db.commit()
            print(f"[seed] Created user '{email}'.")
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed())
