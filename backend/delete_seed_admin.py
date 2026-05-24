"""Remove the configured seed admin account or just revoke its admin role.

Usage:
    # Show usage (no action)
    python delete_seed_admin.py

    # Legacy: delete the user row entirely (preserves README contract)
    SEED_ADMIN_EMAIL=admin@healthos.local python delete_seed_admin.py --confirm

    # New: revoke admin role only, keep user row
    SEED_ADMIN_EMAIL=admin@healthos.local python delete_seed_admin.py --revoke-role

    # --confirm is accepted alongside --revoke-role as an explicit ack
    SEED_ADMIN_EMAIL=admin@healthos.local python delete_seed_admin.py --revoke-role --confirm
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
from app.services.rbac import DEFAULT_ROLE_ADMIN, revoke_role


def _target_email() -> str | None:
    raw = os.getenv("SEED_ADMIN_EMAIL") or os.getenv("SEED_ADMIN_EMAILS", "").split(",")[0].strip()
    return raw.strip().lower() or None


async def run(*, confirm: bool, revoke_role_only: bool) -> None:
    email = _target_email()
    if not email:
        print("[delete] SEED_ADMIN_EMAIL is missing; nothing to do.")
        raise SystemExit(1)

    if not confirm and not revoke_role_only:
        print(
            "[delete] No action flag provided.\n"
            "  --confirm          delete the user row (legacy behaviour)\n"
            "  --revoke-role      remove admin role only; keep user row\n"
        )
        raise SystemExit(2)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is None:
                print(f"[delete] User '{email}' does not exist; nothing to do.")
                return

            if revoke_role_only:
                await revoke_role(db, user.id, DEFAULT_ROLE_ADMIN)
                await db.commit()
                print(f"[delete] Revoked admin role from '{email}'; user row kept.")
            else:
                # Legacy --confirm path: delete the user row.
                await db.delete(user)
                await db.commit()
                print(f"[delete] Deleted user '{email}'.")
        except Exception:
            await db.rollback()
            print(f"[delete] Error while processing '{email}'. Rolled back.", file=sys.stderr)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete or demote the configured seed admin.")
    parser.add_argument("--confirm", action="store_true", help="Delete the user row (legacy).")
    parser.add_argument("--revoke-role", action="store_true", dest="revoke_role",
                        help="Remove admin role only; keep user row.")
    args = parser.parse_args()
    asyncio.run(run(confirm=args.confirm, revoke_role_only=args.revoke_role))


if __name__ == "__main__":
    main()
