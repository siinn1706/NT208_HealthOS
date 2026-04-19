"""B7 P9 — soft-delete columns on users (deleted_at / purge_at / deletion_reason).

Revision ID: 021_b7_users_soft_delete
Revises: 020_b7_data_export_requests
Create Date: 2026-04-19

Additive only — existing rows get NULL `deleted_at`, which `get_current_user`
treats as "active". The Celery beat `purge_expired_accounts` task uses
`(deleted_at IS NOT NULL AND purge_at <= now())` to find candidates.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_b7_users_soft_delete"
down_revision: Union[str, None] = "020_b7_data_export_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("purge_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("deletion_reason", sa.Text, nullable=True))
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])
    op.create_index("ix_users_purge_at", "users", ["purge_at"])


def downgrade() -> None:
    op.drop_index("ix_users_purge_at", table_name="users")
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_column("users", "deletion_reason")
    op.drop_column("users", "purge_at")
    op.drop_column("users", "deleted_at")
