from __future__ import annotations

import datetime
import uuid

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import HealthMetric, Meal, MetricTypeEnum, User
from app.schemas.dashboard import (
    DashboardAiInsight,
    DashboardAlert,
    DashboardGoal,
    DashboardSummaryDTO,
    KpiValue,
    NutritionSuggestionDTO,
    VitalPointDTO,
)


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _today_window() -> tuple[datetime.datetime, datetime.datetime]:
    now = _utc_now()
    start = datetime.datetime.combine(now.date(), datetime.time.min, tzinfo=datetime.timezone.utc)
    end = datetime.datetime.combine(now.date(), datetime.time.max, tzinfo=datetime.timezone.utc)
    return start, end


def _safe_display_name(user: User) -> str:
    if user.profile and user.profile.full_name:
        return user.profile.full_name
    if user.display_name:
        return user.display_name
    return "Chưa có thông tin"


def _latest_metric_value(
    metrics: list[HealthMetric],
    metric_type: MetricTypeEnum,
) -> float | None:
    for metric in metrics:
        if metric.metric_type == metric_type:
            return float(metric.value)
    return None


async def _latest_metrics(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[HealthMetric]:
    rows = (
        await db.execute(
            select(HealthMetric)
            .where(HealthMetric.user_id == user_id)
            .order_by(HealthMetric.recorded_at.desc())
            .limit(500)
        )
    ).scalars().all()
    return list(rows)


async def _today_meals(db: AsyncSession, user_id: uuid.UUID) -> list[Meal]:
    start, end = _today_window()
    rows = (
        await db.execute(
            select(Meal).where(
                and_(
                    Meal.user_id == user_id,
                    Meal.logged_at >= start,
                    Meal.logged_at <= end,
                )
            )
        )
    ).scalars().all()
    return list(rows)


def _sum_nutrition_value(meals: list[Meal], key: str) -> float:
    total = 0.0
    for meal in meals:
        if isinstance(meal.nutrition_result, dict):
            raw = meal.nutrition_result.get(key)
            if isinstance(raw, (int, float)):
                total += float(raw)
    return total


async def get_dashboard_summary(
    db: AsyncSession,
    user: User,
) -> DashboardSummaryDTO:
    metrics = await _latest_metrics(db, user.id)
    meals = await _today_meals(db, user.id)

    heart_rate = _latest_metric_value(metrics, MetricTypeEnum.HEART_RATE)
    steps = _latest_metric_value(metrics, MetricTypeEnum.STEPS)
    sleep_minutes = _latest_metric_value(metrics, MetricTypeEnum.SLEEP_MINUTES)
    systolic = _latest_metric_value(metrics, MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC)
    diastolic = _latest_metric_value(metrics, MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC)

    calories_intake = _sum_nutrition_value(meals, "calories")
    calories_burned = (steps * 0.04) if steps is not None else None
    sleep_score = (
        min(round((sleep_minutes / 480.0) * 100.0, 1), 100.0)
        if sleep_minutes is not None
        else None
    )

    alerts: list[DashboardAlert] = []
    if heart_rate is not None and heart_rate > 100:
        alerts.append(
            DashboardAlert(
                id="alert-heart-rate-high",
                type="warning",
                message=f"Nhip tim hien tai {round(heart_rate)} bpm vuot nguong khuyen nghi.",
            )
        )
    if systolic is not None and systolic >= 140:
        alerts.append(
            DashboardAlert(
                id="alert-bp-systolic",
                type="critical",
                message=f"Huyet ap tam thu {round(systolic)} mmHg dang o muc cao.",
            )
        )
    if diastolic is not None and diastolic >= 90:
        alerts.append(
            DashboardAlert(
                id="alert-bp-diastolic",
                type="critical",
                message=f"Huyet ap tam truong {round(diastolic)} mmHg dang o muc cao.",
            )
        )

    ai_insight: DashboardAiInsight | None = None
    if calories_intake > 0:
        ratio = calories_intake / 2000.0
        if ratio < 0.6:
            insight_text = "Ban dang an duoi nhu cau nang luong trong ngay."
            category = "nutrition"
        elif ratio > 1.2:
            insight_text = "Luong calo hom nay cao hon muc khuyen nghi."
            category = "nutrition"
        else:
            insight_text = "Nang luong hom nay dang gan muc muc tieu."
            category = "nutrition"
        ai_insight = DashboardAiInsight(text=insight_text, category=category)
    elif steps is not None:
        ai_insight = DashboardAiInsight(
            text="Ban co du lieu van dong, tiep tuc duy tri de cai thien suc khoe.",
            category="activity",
        )

    return DashboardSummaryDTO(
        user_name=_safe_display_name(user),
        alerts=alerts,
        kpis={
            "caloriesBurned": KpiValue(current=calories_burned, target=2000),
            "sleepScore": KpiValue(current=sleep_score, target=100),
            "heartRate": KpiValue(current=heart_rate, target=100),
            "steps": KpiValue(current=steps, target=10000),
        },
        goals=[
            DashboardGoal(
                id="goal-water",
                key="water",
                current=None,
                target=2000,
                unit="ml",
            ),
            DashboardGoal(
                id="goal-steps",
                key="steps",
                current=steps,
                target=10000,
                unit="buoc",
            ),
            DashboardGoal(
                id="goal-calories",
                key="calories",
                current=calories_intake if calories_intake > 0 else None,
                target=2000,
                unit="kcal",
            ),
        ],
        ai_insight=ai_insight,
    )


async def get_vitals_timeseries(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 7,
) -> list[VitalPointDTO]:
    if days < 1:
        return []

    now = _utc_now()
    start = now - datetime.timedelta(days=days - 1)
    metric_types = (
        MetricTypeEnum.HEART_RATE,
        MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
        MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
    )

    rows = (
        await db.execute(
            select(HealthMetric)
            .where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.metric_type.in_(metric_types),
                    HealthMetric.recorded_at >= start,
                )
            )
            .order_by(HealthMetric.recorded_at.asc())
        )
    ).scalars().all()

    by_date: dict[str, VitalPointDTO] = {}
    for row in rows:
        key = row.recorded_at.date().isoformat()
        if key not in by_date:
            by_date[key] = VitalPointDTO(date=key)
        point = by_date[key]
        if row.metric_type == MetricTypeEnum.HEART_RATE:
            point.heart_rate = float(row.value)
        elif row.metric_type == MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC:
            point.systolic = float(row.value)
        elif row.metric_type == MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC:
            point.diastolic = float(row.value)

    result: list[VitalPointDTO] = []
    for i in range(days):
        date_str = (start.date() + datetime.timedelta(days=i)).isoformat()
        result.append(by_date.get(date_str, VitalPointDTO(date=date_str)))
    return result


async def get_nutrition_suggestions(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[NutritionSuggestionDTO]:
    meals = await _today_meals(db, user_id)
    if not meals:
        return [
            NutritionSuggestionDTO(
                id="nutrition-no-data",
                type="tip",
                icon="Info",
                title="Chua co thong tin",
                message="Hom nay chua co du lieu bua an de phan tich.",
                priority=1,
                cta=None,
            )
        ]

    calories = _sum_nutrition_value(meals, "calories")
    protein = _sum_nutrition_value(meals, "protein_g")
    carbs = _sum_nutrition_value(meals, "carbs_g")
    fat = _sum_nutrition_value(meals, "fat_g")

    suggestions: list[NutritionSuggestionDTO] = []
    if protein < 80:
        suggestions.append(
            NutritionSuggestionDTO(
                id="nutrition-protein-low",
                type="warning",
                icon="AlertCircle",
                title="Protein dang thap",
                message="Can bo sung them nguon dam de can bang khau phan.",
                priority=1,
                cta=None,
            )
        )
    if calories > 2300:
        suggestions.append(
            NutritionSuggestionDTO(
                id="nutrition-calories-high",
                type="warning",
                icon="AlertCircle",
                title="Calo vuot muc muc tieu",
                message="Luong calo hom nay dang cao hon muc khuyen nghi.",
                priority=2,
                cta=None,
            )
        )
    if calories < 1300:
        suggestions.append(
            NutritionSuggestionDTO(
                id="nutrition-calories-low",
                type="tip",
                icon="Lightbulb",
                title="Can nang luong bo sung",
                message="Tong calo hom nay con thap, can bo sung bua phu.",
                priority=2,
                cta=None,
            )
        )

    if not suggestions:
        suggestions.append(
            NutritionSuggestionDTO(
                id="nutrition-balanced",
                type="success",
                icon="CheckCircle",
                title="Khau phan dang can bang",
                message=f"Protein {round(protein)}g, carbs {round(carbs)}g, chat beo {round(fat)}g.",
                priority=3,
                cta=None,
            )
        )

    return sorted(suggestions, key=lambda item: item.priority)

