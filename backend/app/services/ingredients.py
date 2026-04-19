"""Ingredient catalog service.

Search supports both name columns so a Vietnamese-locale user typing
"cơm" gets `Cơm trắng` while an English-locale user typing "rice" gets
the same row. Results are bilingual (both names always returned), and the FE
locale picks which to display.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Ingredient


MAX_PER_PAGE = 100


async def search_ingredients(
    db: AsyncSession,
    *,
    query: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Ingredient], int]:
    """Substring match on either localized name. Newest matches first."""
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    page = max(1, page)

    base = select(Ingredient)
    if query:
        like = f"%{query.strip()}%"
        base = base.where(
            or_(
                Ingredient.name_vi.ilike(like),
                Ingredient.name_en.ilike(like),
                Ingredient.slug.ilike(like),
            )
        )
    if category:
        base = base.where(Ingredient.category == category)

    total_stmt = select(func.count()).select_from(base.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    rows = (
        await db.execute(
            base.order_by(Ingredient.name_vi.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()
    return list(rows), total


async def get_by_id(db: AsyncSession, ingredient_id: uuid.UUID) -> Optional[Ingredient]:
    return (
        await db.execute(select(Ingredient).where(Ingredient.id == ingredient_id))
    ).scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Ingredient]:
    return (
        await db.execute(select(Ingredient).where(Ingredient.slug == slug))
    ).scalar_one_or_none()
