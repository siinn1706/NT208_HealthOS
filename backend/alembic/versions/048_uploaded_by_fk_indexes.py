"""Add missing FK indexes on uploaded_by columns.

Revision ID: 048_uploaded_by_fk_indexes
Revises: 047_medication_pause_metadata
Create Date: 2026-06-03

Both `prescription_assets.uploaded_by` and `appointment_assets.uploaded_by`
carry FK references to `users.id` with ondelete=SET NULL but had no B-tree
index. Without indexes Postgres degrades to a sequential scan when cascading
a user deletion (SET NULL walk) or when joining to the uploader row for
display — O(n) scans per user delete instead of index lookups.

Additive-only. Plain CREATE INDEX (safe for dev/staging; production should
prefer CREATE INDEX CONCURRENTLY).
"""
from __future__ import annotations

from typing import Union

from alembic import op

revision: str = "048_uploaded_by_fk_indexes"
down_revision: Union[str, None] = "047_medication_pause_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_prescription_assets_uploaded_by",
        "prescription_assets",
        ["uploaded_by"],
    )
    op.create_index(
        "ix_appointment_assets_uploaded_by",
        "appointment_assets",
        ["uploaded_by"],
    )


def downgrade() -> None:
    op.drop_index("ix_appointment_assets_uploaded_by", table_name="appointment_assets")
    op.drop_index("ix_prescription_assets_uploaded_by", table_name="prescription_assets")
