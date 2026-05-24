"""Add RBAC foundation tables: roles, permissions, user_roles, role_permissions.

Also extends audit_event_type_enum with RBAC grant/revoke values.

Revision ID: 036_rbac_foundation
Revises: 035_merge_security_and_app_heads
Create Date: 2026-05-24
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "036_rbac_foundation"
down_revision = "035_merge_security_and_app_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend audit enum before creating tables (service writes audit rows on grant/revoke).
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS 'rbac_role_granted'")
        op.execute("ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS 'rbac_role_revoked'")

    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("code", name="uq_roles_code"),
    )
    op.create_index("ix_roles_code", "roles", ["code"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("code", name="uq_permissions_code"),
    )
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)

    op.create_table(
        "user_roles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "role_id", name="pk_user_roles"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("role_id", "permission_id", name="pk_role_permissions"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    # NOTE: code revert of User.roles relationship in core.py MUST happen before
    # running this downgrade, otherwise the app boots against a missing table.
    op.drop_table("role_permissions")
    op.drop_table("user_roles")
    op.drop_index("ix_permissions_code", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("ix_roles_code", table_name="roles")
    op.drop_table("roles")
    # PostgreSQL does not support removing enum values; audit enum entries remain.
