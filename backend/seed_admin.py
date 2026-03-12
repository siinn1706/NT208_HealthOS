"""
Seed script — creates a test account if it doesn't already exist.

Usage (from repo root, with venv activated):
    cd backend
    python seed_admin.py

Account created:
    email:    admin@healthos.local
    password: admin
"""
import asyncio
import sys
import os

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.core import User, UserProfile


SEED_EMAIL = "admin@healthos.local"
SEED_PASSWORD = "admin"
SEED_DISPLAY_NAME = "Admin Test"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == SEED_EMAIL))
        existing: User | None = result.scalar_one_or_none()

        if existing:
            print(f"[seed] User '{SEED_EMAIL}' already exists — skipping.")
        else:
            user = User(
                email=SEED_EMAIL,
                display_name=SEED_DISPLAY_NAME,
                hashed_password=hash_password(SEED_PASSWORD),
            )
            db.add(user)
            await db.flush()

            profile = UserProfile(
                user_id=user.id,
                full_name=SEED_DISPLAY_NAME,
            )
            db.add(profile)
            await db.commit()
            print(f"[seed] Created user '{SEED_EMAIL}' with password '{SEED_PASSWORD}'.")


if __name__ == "__main__":
    asyncio.run(seed())
