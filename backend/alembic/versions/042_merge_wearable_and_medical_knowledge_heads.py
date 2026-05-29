"""Merge wearable security and medical knowledge migration heads.

Revision ID: 042_merge_wearable_and_medical_knowledge_heads
Revises: 037_merge_wearable_into_app_heads, 041_medical_knowledge_rag
Create Date: 2026-05-29
"""
from __future__ import annotations

from typing import Union


revision: str = "042_merge_wearable_and_medical_knowledge_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "037_merge_wearable_into_app_heads",
    "041_medical_knowledge_rag",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
