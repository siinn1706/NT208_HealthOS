"""Question bank — read-only catalog query for the curated suggestion list.

The bank is seeded by Alembic migration 024. Endpoints query it through the
small public surface here (no business logic — just DB filtering).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visit_briefs import QuestionTemplate


async def list_canonical(db: AsyncSession) -> list[QuestionTemplate]:
    """Return the four Healthwatch canonical questions (always shown)."""
    rows = await db.execute(
        select(QuestionTemplate)
        .where(QuestionTemplate.is_canonical.is_(True))
        .order_by(QuestionTemplate.default_order.asc())
    )
    return list(rows.scalars().all())


async def list_suggestions(
    db: AsyncSession,
    *,
    visit_type: Optional[str] = None,
    concern_category: Optional[str] = None,
) -> list[QuestionTemplate]:
    """Return suggestions for the given (visit_type, concern_category) pair.

    Templates with `visit_type IS NULL` are universal across visit types
    (and similarly for concern_category). Canonical four come first, then
    visit-type-scoped, then concern-scoped, ordered by `default_order`.
    """
    stmt = select(QuestionTemplate)
    conditions = []
    if visit_type is not None:
        conditions.append(
            (QuestionTemplate.visit_type == visit_type)
            | QuestionTemplate.visit_type.is_(None)
        )
    if concern_category is not None:
        conditions.append(
            (QuestionTemplate.concern_category == concern_category)
            | QuestionTemplate.concern_category.is_(None)
        )
    if conditions:
        for cond in conditions:
            stmt = stmt.where(cond)
    stmt = stmt.order_by(
        QuestionTemplate.is_canonical.desc(),
        QuestionTemplate.default_order.asc(),
    )
    rows = await db.execute(stmt)
    return list(rows.scalars().all())


def template_to_question_item(
    tpl: QuestionTemplate, *, order: int, locked: bool = False
) -> dict:
    """Project a template row into the JSONB shape used by `question_sets.questions`."""
    return {
        "id": tpl.slug,
        "source": "template",
        "text_vi": tpl.text_vi,
        "text_en": tpl.text_en,
        "order": order,
        "locked": locked,
    }
