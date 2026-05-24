"""Merge security audit enum and app schema migration heads.

Revision ID: 035_merge_security_and_app_heads
Revises: 031_add_security_access_denied_enum, 034_health_metrics_analytics_index
Create Date: 2026-05-24

Keeps `alembic upgrade head` on a single canonical path after the security
audit enum migration and the app-schema migration chain landed independently.
"""
from __future__ import annotations

from typing import Union


revision: str = "035_merge_security_and_app_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "031_add_security_access_denied_enum",
    "034_health_metrics_analytics_index",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
