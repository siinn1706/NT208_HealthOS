from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Meal, MealStatusEnum
from app.services._ownership import get_owned


def _safe_float(value: object) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if number >= 0 else 0.0


def _apply_meal_date_filters(
    stmt: Select[tuple[Meal]],
    date_from: datetime.date | None,
    date_to: datetime.date | None,
) -> Select[tuple[Meal]]:
    if date_from is not None:
        start_dt = datetime.datetime.combine(
            date_from,
            datetime.time.min,
            tzinfo=datetime.timezone.utc,
        )
        stmt = stmt.where(Meal.logged_at >= start_dt)

    if date_to is not None:
        end_dt = datetime.datetime.combine(
            date_to,
            datetime.time.max,
            tzinfo=datetime.timezone.utc,
        )
        stmt = stmt.where(Meal.logged_at <= end_dt)

    return stmt


async def list_meals(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    per_page: int = 20,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
) -> tuple[list[Meal], int]:
    base_stmt = select(Meal).where(Meal.user_id == user_id)
    base_stmt = _apply_meal_date_filters(base_stmt, date_from, date_to)

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    offset = (page - 1) * per_page
    data_stmt = (
        base_stmt
        .order_by(Meal.logged_at.desc(), Meal.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    meals = (await db.execute(data_stmt)).scalars().all()
    return meals, total


async def create_meal(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    logged_at: datetime.datetime | None,
    image_url: str | None = None,
    job_id: str | None = None,
) -> Meal:
    meal = Meal(
        user_id=user_id,
        name=name,
        image_url=image_url,
        job_id=job_id,
        status=MealStatusEnum.PROCESSING if job_id else MealStatusEnum.PENDING,
        nutrition_result=None,
        logged_at=logged_at or datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(meal)
    await db.flush()
    return meal


async def get_meal_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    meal_id: uuid.UUID,
) -> Meal | None:
    return await get_owned(db, Meal, id_=meal_id, user_id=user_id)


async def update_meal(
    db: AsyncSession,
    user_id: uuid.UUID,
    meal_id: uuid.UUID,
    *,
    name: str | None = None,
    logged_at: datetime.datetime | None = None,
) -> Meal | None:
    meal = await get_meal_by_id(db, user_id, meal_id)
    if meal is None:
        return None
    if name is not None:
        meal.name = name.strip()
    if logged_at is not None:
        meal.logged_at = logged_at
    await db.flush()
    return meal


async def get_meal_ingredients(
    db: AsyncSession,
    user_id: uuid.UUID,
    meal_id: uuid.UUID,
) -> list[dict] | None:
    meal = await get_meal_by_id(db, user_id, meal_id)
    if meal is None:
        return None

    nutrition = meal.nutrition_result if isinstance(meal.nutrition_result, dict) else {}
    rows: list[dict] = []

    raw_items = nutrition.get("ingredients")
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            name = str(item.get("ingredient_name") or item.get("name") or "").strip()
            if not name:
                continue
            rows.append(
                {
                    "name": name,
                    "grams": _safe_float(item.get("grams")),
                    "kcal": _safe_float(item.get("calories") or item.get("kcal")),
                    "carbs_g": _safe_float(item.get("carbs_g")),
                    "protein_g": _safe_float(item.get("protein_g")),
                    "fat_g": _safe_float(item.get("fat_g")),
                }
            )
    if rows:
        return rows

    calories = _safe_float(nutrition.get("calories"))
    carbs = _safe_float(nutrition.get("carbs_g"))
    protein = _safe_float(nutrition.get("protein_g"))
    fat = _safe_float(nutrition.get("fat_g"))
    if calories or carbs or protein or fat:
        rows.append(
            {
                "name": str(nutrition.get("dish_name") or meal.name),
                "grams": 100.0,
                "kcal": calories,
                "carbs_g": carbs,
                "protein_g": protein,
                "fat_g": fat,
            }
        )
    return rows


async def update_meal_result(
    db: AsyncSession,
    meal_id: uuid.UUID,
    nutrition_result: dict,
) -> Meal | None:
    """Update meal with nutrition analysis result.
    
    INTERNAL: called only by Celery task, not exposed via API.
    """
    meal = (await db.execute(select(Meal).where(Meal.id == meal_id))).scalar_one_or_none()
    if meal is None:
        return None
    meal.status = MealStatusEnum.ANALYZED
    meal.nutrition_result = nutrition_result
    await db.flush()
    # Pass a sentinel user_id=None bypass: fetch directly by meal id only
    result = await db.execute(select(Meal).where(Meal.id == meal_id))
    return result.scalar_one_or_none()


async def get_meal_analysis_status(
    db: AsyncSession,
    user_id: uuid.UUID,
    meal_id: uuid.UUID,
) -> dict | None:
    """Get analysis status for a meal."""
    meal = await get_meal_by_id(db, user_id, meal_id)
    if not meal:
        return None
    return {
        "meal_id": str(meal.id),
        "job_id": meal.job_id,
        "status": meal.status.value,
        "nutrition_result": meal.nutrition_result,
    }
