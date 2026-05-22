from __future__ import annotations

import datetime
import json
import logging
import uuid

import httpx
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.core import HealthMetric, Meal, MetricTypeEnum, User
from app.schemas.dashboard import (
    DashboardAiInsight,
    DashboardAlert,
    DashboardGoal,
    DashboardSummaryDTO,
    ExerciseSuggestionDTO,
    ExtendedVitalPointDTO,
    KpiValue,
    NutritionSuggestionDTO,
    VitalPointDTO,
)

_LOGGER = logging.getLogger(__name__)
_EXERCISE_CACHE_TTL = 3600  # 1 hour


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


async def get_extended_vitals_timeseries(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 30,
) -> list[ExtendedVitalPointDTO]:
    """Returns timeseries for all 6 metric types: HR, BP sys/dia, steps, sleep, weight."""
    if days < 1:
        return []

    now = _utc_now()
    start = now - datetime.timedelta(days=days - 1)
    metric_types = (
        MetricTypeEnum.HEART_RATE,
        MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
        MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
        MetricTypeEnum.STEPS,
        MetricTypeEnum.SLEEP_MINUTES,
        MetricTypeEnum.WEIGHT_KG,
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

    by_date: dict[str, ExtendedVitalPointDTO] = {}
    for row in rows:
        key = row.recorded_at.date().isoformat()
        if key not in by_date:
            by_date[key] = ExtendedVitalPointDTO(date=key)
        point = by_date[key]
        v = float(row.value)
        if row.metric_type == MetricTypeEnum.HEART_RATE:
            point.heart_rate = v
        elif row.metric_type == MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC:
            point.systolic = v
        elif row.metric_type == MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC:
            point.diastolic = v
        elif row.metric_type == MetricTypeEnum.STEPS:
            point.steps = v
        elif row.metric_type == MetricTypeEnum.SLEEP_MINUTES:
            point.sleep_minutes = v
        elif row.metric_type == MetricTypeEnum.WEIGHT_KG:
            point.weight_kg = v

    result: list[ExtendedVitalPointDTO] = []
    for i in range(days):
        date_str = (start.date() + datetime.timedelta(days=i)).isoformat()
        result.append(by_date.get(date_str, ExtendedVitalPointDTO(date=date_str)))
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

async def _call_ai_worker_exercise(
    user_context: dict,
    locale: str = "vi",
) -> list[ExerciseSuggestionDTO]:
    """POST user health context to AI worker, return parsed suggestions."""
    url = f"{settings.ai_worker_url.rstrip('/')}/api/ai/exercise-suggestions"
    timeout = httpx.Timeout(settings.ai_worker_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json={
            "user_context": user_context,
            "count": 3,
            "locale": locale,
        })
        resp.raise_for_status()
        data = resp.json()

    raw_items: list[dict] = data.get("suggestions", [])
    result: list[ExerciseSuggestionDTO] = []
    for item in raw_items:
        try:
            result.append(ExerciseSuggestionDTO(
                id=str(item.get("id", "ai-suggestion")),
                type=item.get("type", "tip"),
                icon=item.get("icon", "Dumbbell"),
                title=str(item.get("title", "")),
                message=str(item.get("message", "")),
                message_params=item.get("message_params") or {},
                priority=int(item.get("priority", 3)),
                duration_minutes=(
                    int(item["duration_minutes"])
                    if item.get("duration_minutes") is not None
                    else None
                ),
                intensity=item.get("intensity", "medium"),
                category=item.get("category", "cardio"),
                source="ai",
            ))
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("exercise_dto_parse_skip item=%s reason=%s", item, exc)
    return result


async def _rule_based_exercise_suggestions(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[ExerciseSuggestionDTO]:
    """Original rule-based exercise suggestions — used as AI fallback."""
    import datetime as _dt
    metrics = await _latest_metrics(db, user_id)
    meals = await _today_meals(db, user_id)

    steps           = _latest_metric_value(metrics, MetricTypeEnum.STEPS)
    sleep_minutes   = _latest_metric_value(metrics, MetricTypeEnum.SLEEP_MINUTES)
    heart_rate      = _latest_metric_value(metrics, MetricTypeEnum.HEART_RATE)
    systolic        = _latest_metric_value(metrics, MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC)
    calories_intake = _sum_nutrition_value(meals, "calories")
    weekday         = _dt.datetime.now().weekday()

    suggestions: list[ExerciseSuggestionDTO] = []

    if steps is None and sleep_minutes is None and heart_rate is None:
        return [ExerciseSuggestionDTO(
            id="exercise-no-data", type="tip", icon="Info",
            title="EXERCISE_NO_DATA", message="EXERCISE_NO_DATA",
            priority=1, duration_minutes=None, intensity="low", category="cardio",
        )]

    if heart_rate is not None and heart_rate > 100:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-hr-breathing", type="warning", icon="Heart",
            title="EXERCISE_HR_BREATHING", message="EXERCISE_HR_BREATHING",
            message_params={"heart_rate": round(heart_rate)},
            priority=1, duration_minutes=15, intensity="low", category="balance",
        ))
    elif heart_rate is not None and heart_rate > 90:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-hr-elevated", type="tip", icon="Heart",
            title="EXERCISE_HR_ELEVATED", message="EXERCISE_HR_ELEVATED",
            message_params={"heart_rate": round(heart_rate)},
            priority=2, duration_minutes=20, intensity="low", category="balance",
        ))

    if systolic is not None and systolic > 135:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-bp-yoga", type="warning", icon="Target",
            title="EXERCISE_BP_YOGA", message="EXERCISE_BP_YOGA",
            message_params={"systolic": round(systolic)},
            priority=1, duration_minutes=25, intensity="low", category="flexibility",
        ))

    if steps is not None and steps < 5000:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-walk-more", type="warning", icon="Footprints",
            title="EXERCISE_WALK_MORE", message="EXERCISE_WALK_MORE",
            message_params={"steps": round(steps), "target": 10000,
                            "remaining": max(0, 10000 - round(steps))},
            priority=2, duration_minutes=30, intensity="low", category="cardio",
        ))
    elif steps is not None and steps < 8000:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-walk-boost", type="goal", icon="Footprints",
            title="EXERCISE_WALK_BOOST", message="EXERCISE_WALK_BOOST",
            message_params={"steps": round(steps),
                            "remaining": max(0, 10000 - round(steps))},
            priority=3, duration_minutes=20, intensity="low", category="cardio",
        ))

    if sleep_minutes is not None and sleep_minutes < 360:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-sleep-yoga", type="tip", icon="Moon",
            title="EXERCISE_SLEEP_YOGA", message="EXERCISE_SLEEP_YOGA",
            message_params={"sleep_hours": round(sleep_minutes / 60, 1)},
            priority=3, duration_minutes=20, intensity="low", category="flexibility",
        ))

    if calories_intake > 2200:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-burn-calories", type="goal", icon="Flame",
            title="EXERCISE_BURN_CALORIES", message="EXERCISE_BURN_CALORIES",
            message_params={"calories": round(calories_intake),
                            "deficit": round(calories_intake - 2200)},
            priority=2, duration_minutes=45, intensity="medium", category="cardio",
        ))

    if steps is not None and steps >= 12000:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-hiit", type="success", icon="Zap",
            title="EXERCISE_HIIT", message="EXERCISE_HIIT",
            message_params={"steps": round(steps)},
            priority=3, duration_minutes=20, intensity="high", category="cardio",
        ))
    elif steps is not None and steps >= 8000:
        suggestions.append(ExerciseSuggestionDTO(
            id="exercise-strength", type="success", icon="Dumbbell",
            title="EXERCISE_STRENGTH", message="EXERCISE_STRENGTH",
            message_params={"steps": round(steps)},
            priority=3, duration_minutes=30, intensity="medium", category="strength",
        ))

    if not suggestions:
        day_map = {
            (0, 3): ("exercise-balanced-strength", "success", "Dumbbell",
                     "EXERCISE_BALANCED_STRENGTH", 35, "medium", "strength"),
            (1, 4): ("exercise-balanced-cardio",   "success", "Flame",
                     "EXERCISE_BALANCED_CARDIO",   30, "medium", "cardio"),
            (2,):   ("exercise-balanced-flex",     "tip",     "Target",
                     "EXERCISE_BALANCED_FLEX",     25, "low",    "flexibility"),
        }
        matched = next(
            (v for days, v in day_map.items() if weekday in days), None
        ) or ("exercise-balanced-rest", "success", "CheckCircle",
              "EXERCISE_BALANCED_REST", 20, "low", "balance")
        _id, _type, _icon, _key, _dur, _int, _cat = matched
        suggestions.append(ExerciseSuggestionDTO(
            id=_id, type=_type, icon=_icon,
            title=_key, message=_key,
            priority=4, duration_minutes=_dur, intensity=_int, category=_cat,
        ))

    return sorted(suggestions, key=lambda item: item.priority)[:3]


async def get_exercise_suggestions(
    db: AsyncSession,
    user_id: uuid.UUID,
    user: User | None = None,
    locale: str = "vi",
) -> list[ExerciseSuggestionDTO]:
    """Return AI-powered exercise suggestions (Gemini + RAG), with rule-based fallback.

    Flow:
    1. Check Redis cache  (TTL = 1 h)
    2. Build RAG context from DB  (health metrics 7d + meals + risk + profile)
    3. POST to AI worker  → Gemini 2.0 Flash generates personalised JSON
    4. Store in Redis cache
    5. On any failure → fall back to rule-based engine
    """
    from app.adapters.redis_client import get_redis

    cache_key = f"ai:exercise:{user_id}"

    # ── 1. Cache hit ────────────────────────────────────────────────────────
    try:
        redis = await get_redis()
        cached = await redis.get(cache_key)
        if cached:
            raw: list[dict] = json.loads(cached)
            return [ExerciseSuggestionDTO(**item) for item in raw]
    except Exception as exc:  # noqa: BLE001 - Redis optional
        _LOGGER.debug("exercise_cache_read_failed reason=%s", exc)

    # ── 2. Build RAG context ────────────────────────────────────────────────
    try:
        if user is None:
            from sqlalchemy import select as _select
            from app.models.core import User as _User
            result = await db.execute(_select(_User).where(_User.id == user_id))
            user = result.scalar_one_or_none()

        if user is not None:
            from app.services.ai_chat_context import build_user_context
            user_context = await build_user_context(db, user)
        else:
            user_context = {}
    except Exception as exc:  # noqa: BLE001
        _LOGGER.warning("exercise_context_build_failed reason=%s", exc)
        user_context = {}

    # ── 3. AI Worker call ───────────────────────────────────────────────────
    try:
        suggestions = await _call_ai_worker_exercise(user_context, locale=locale)
        if not suggestions:
            raise ValueError("AI returned empty suggestions list")

        # ── 4. Cache ────────────────────────────────────────────────────────
        try:
            redis = await get_redis()
            payload = [s.model_dump() for s in suggestions]
            await redis.setex(cache_key, _EXERCISE_CACHE_TTL, json.dumps(payload, default=str))
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("exercise_cache_write_failed reason=%s", exc)

        return suggestions

    except Exception as exc:  # noqa: BLE001
        _LOGGER.warning("exercise_ai_failed reason=%s — falling back to rule-based", exc)
        return await _rule_based_exercise_suggestions(db, user_id)
