"""Delete the configured local demo/admin account.

This script intentionally requires --confirm and never deletes anything when
SEED_ADMIN_EMAIL is missing.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.models.core import User


def _target_email() -> str | None:
    raw = os.getenv("SEED_ADMIN_EMAIL")
    if raw is None:
        return None
    value = raw.strip()
    return value or None


async def delete_seed_admin(*, confirm: bool) -> None:
    email = _target_email()
    if not email:
        print("[delete] SEED_ADMIN_EMAIL is missing; nothing to delete.")
        return

    print(f"[delete] Target email: {email}")
    if not confirm:
        print("[delete] Refusing to delete without --confirm.")
        raise SystemExit(2)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is None:
                print(f"[delete] User '{email}' does not exist; nothing to delete.")
                return

            await db.delete(user)
            await db.commit()
            print(f"[delete] Deleted user '{email}'.")
        except Exception:
            await db.rollback()
            print(f"[delete] Error while deleting '{email}'. Rolled back.", file=sys.stderr)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete the configured seed admin account.")
    parser.add_argument("--confirm", action="store_true", help="Required to perform deletion.")
    args = parser.parse_args()
    asyncio.run(delete_seed_admin(confirm=args.confirm))


if __name__ == "__main__":
    main()
