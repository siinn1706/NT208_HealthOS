"""Merge the wearable-security chain into the RBAC/app head.

Revision ID: 037_merge_wearable_into_app_heads
Revises: 036_rbac_foundation, 034_enforce_google_wearable_account_uniqueness
Create Date: 2026-05-24

After merging `main` into the `wearable-security-fixes` branch the repository
had two divergent Alembic heads:

  * `036_rbac_foundation`                             — main chain
  * `034_enforce_google_wearable_account_uniqueness`  — wearable chain

This pure-merge node restores `alembic upgrade head` as the single canonical
upgrade path. No schema changes; downstream migrations may depend on this
revision instead of either parent.
"""
from __future__ import annotations

from typing import Union


revision: str = "037_merge_wearable_into_app_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "036_rbac_foundation",
    "034_enforce_google_wearable_account_uniqueness",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
