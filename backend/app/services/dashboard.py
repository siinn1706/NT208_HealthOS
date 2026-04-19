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
    return user.email


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
    # `is_deleted=false` hides Health Connect tombstones (HC reported a
    # deletion via getChanges → service flips the row). Without this the
    # KPI tiles + alerts keep using values the user already removed.
    rows = (
        await db.execute(
            select(HealthMetric)
            .where(
                HealthMetric.user_id == user_id,
                HealthMetric.is_deleted.is_(False),
            )
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
                message="HEART_RATE_HIGH",
                alert_code="HEART_RATE_HIGH",
                alert_params={"value": round(heart_rate), "unit": "bpm", "threshold": 100},
            )
        )
    if systolic is not None and systolic >= 140:
        alerts.append(
            DashboardAlert(
                id="alert-bp-systolic",
                type="critical",
                message="BP_SYSTOLIC_HIGH",
                alert_code="BP_SYSTOLIC_HIGH",
                alert_params={"value": round(systolic), "unit": "mmHg", "threshold": 140},
            )
        )
    if diastolic is not None and diastolic >= 90:
        alerts.append(
            DashboardAlert(
                id="alert-bp-diastolic",
                type="critical",
                message="BP_DIASTOLIC_HIGH",
                alert_code="BP_DIASTOLIC_HIGH",
                alert_params={"value": round(diastolic), "unit": "mmHg", "threshold": 90},
            )
        )

    ai_insight: DashboardAiInsight | None = None
    if calories_intake > 0:
        ratio = calories_intake / 2000.0
        if ratio < 0.6:
            insight_text = "CALORIE_LOW"
            insight_code = "CALORIE_LOW"
            category = "nutrition"
        elif ratio > 1.2:
            insight_text = "CALORIE_HIGH"
            insight_code = "CALORIE_HIGH"
            category = "nutrition"
        else:
            insight_text = "CALORIE_NORMAL"
            insight_code = "CALORIE_NORMAL"
            category = "nutrition"
        ai_insight = DashboardAiInsight(text=insight_text, category=category, insight_code=insight_code)
    elif steps is not None:
        ai_insight = DashboardAiInsight(
            text="ACTIVITY_GOOD",
            category="activity",
            insight_code="ACTIVITY_GOOD",
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
                unit="steps",
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
                    HealthMetric.is_deleted.is_(False),
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
                title="NUTRITION_NO_DATA",
                message="NUTRITION_NO_DATA",
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
                title="NUTRITION_PROTEIN_LOW",
                message="NUTRITION_PROTEIN_LOW",
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
                title="NUTRITION_CALORIES_HIGH",
                message="NUTRITION_CALORIES_HIGH",
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
                title="NUTRITION_CALORIES_LOW",
                message="NUTRITION_CALORIES_LOW",
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
                title="NUTRITION_BALANCED",
                message="NUTRITION_BALANCED",
                message_params={"protein": round(protein), "carbs": round(carbs), "fat": round(fat)},
                priority=3,
                cta=None,
            )
        )

    return sorted(suggestions, key=lambda item: item.priority)

