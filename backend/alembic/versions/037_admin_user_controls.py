"""Add admin user controls: ban fields and last_seen_at.

Revision ID: 037_admin_user_controls
Revises: 036_rbac_foundation
Create Date: 2026-05-24
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "037_admin_user_controls"
down_revision = "036_rbac_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS 'admin_user_banned'")
        op.execute("ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS 'admin_user_unbanned'")

    op.add_column("users", sa.Column("banned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("banned_reason", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("banned_by_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("users", sa.Column("banned_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        "fk_users_banned_by_id_users",
        "users",
        "users",
        ["banned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_banned_at", "users", ["banned_at"], unique=False)
    op.create_index("ix_users_banned_by_id", "users", ["banned_by_id"], unique=False)
    op.create_index("ix_users_banned_until", "users", ["banned_until"], unique=False)
    op.create_index("ix_users_last_seen_at", "users", ["last_seen_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_last_seen_at", table_name="users")
    op.drop_index("ix_users_banned_until", table_name="users")
    op.drop_index("ix_users_banned_by_id", table_name="users")
    op.drop_index("ix_users_banned_at", table_name="users")
    op.drop_constraint("fk_users_banned_by_id_users", "users", type_="foreignkey")
    op.drop_column("users", "last_seen_at")
    op.drop_column("users", "banned_until")
    op.drop_column("users", "banned_by_id")
    op.drop_column("users", "banned_reason")
    op.drop_column("users", "banned_at")
    # PostgreSQL cannot remove enum values; audit enum entries remain.
