from __future__ import annotations

import datetime
import math
import statistics
import uuid
from collections import defaultdict

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import HealthMetric, Meal, MetricTypeEnum, Reminder, ReminderTypeEnum, User


REPORT_PERIOD_DAYS: dict[str, int] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
}


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _period_days(period: str) -> int:
    return REPORT_PERIOD_DAYS.get(period, 7)


def _period_start(period: str) -> datetime.datetime:
    days = _period_days(period)
    now = _utc_now()
    return now - datetime.timedelta(days=days - 1)


def _date_range(period: str) -> list[str]:
    start = _period_start(period).date()
    return [(start + datetime.timedelta(days=i)).isoformat() for i in range(_period_days(period))]


def _avg(values: list[float]) -> float:
    return float(statistics.mean(values)) if values else 0.0


def _safe_stats(values: list[float], unit: str) -> dict:
    if not values:
        return {
            "average": 0,
            "min": 0,
            "max": 0,
            "trend": "stable",
            "change_percent": 0,
            "unit": unit,
        }

    avg = _avg(values)
    mn = min(values)
    mx = max(values)
    first = values[0]
    last = values[-1]
    if first == 0:
        change = 0
    else:
        change = round(((last - first) / abs(first)) * 100)

    if abs(change) < 3:
        trend = "stable"
    elif change > 0:
        trend = "improving"
    else:
        trend = "declining"

    return {
        "average": round(avg, 2),
        "min": round(mn, 2),
        "max": round(mx, 2),
        "trend": trend,
        "change_percent": change,
        "unit": unit,
    }


async def _metrics_in_period(
    db: AsyncSession,
    user_id: uuid.UUID,
    period: str,
) -> list[HealthMetric]:
    start = _period_start(period)
    # Exclude Health Connect tombstones (`is_deleted=true`) so risk
    # predictions, reports, and trend analyses don't keep using values
    # the user already removed at the source.
    rows = (
        await db.execute(
            select(HealthMetric)
            .where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.recorded_at >= start,
                    HealthMetric.is_deleted.is_(False),
                )
            )
            .order_by(HealthMetric.recorded_at.asc())
        )
    ).scalars().all()
    return list(rows)


async def _meals_in_period(
    db: AsyncSession,
    user_id: uuid.UUID,
    period: str,
) -> list[Meal]:
    start = _period_start(period)
    rows = (
        await db.execute(
            select(Meal)
            .where(
                and_(
                    Meal.user_id == user_id,
                    Meal.logged_at >= start,
                )
            )
            .order_by(Meal.logged_at.asc())
        )
    ).scalars().all()
    return list(rows)


def _daily_metric_series(
    metrics: list[HealthMetric],
    metric_type: MetricTypeEnum,
    period: str,
) -> list[dict]:
    dates = _date_range(period)
    grouped: dict[str, list[float]] = defaultdict(list)
    for metric in metrics:
        if metric.metric_type == metric_type:
            grouped[metric.recorded_at.date().isoformat()].append(float(metric.value))

    result: list[dict] = []
    for date_key in dates:
        values = grouped.get(date_key, [])
        result.append({"date": date_key, "value": round(_avg(values), 2) if values else 0})
    return result


def _daily_meal_totals(meals: list[Meal], period: str) -> list[dict]:
    dates = _date_range(period)
    grouped: dict[str, list[dict]] = defaultdict(list)
    for meal in meals:
        if isinstance(meal.nutrition_result, dict):
            grouped[meal.logged_at.date().isoformat()].append(meal.nutrition_result)

    result: list[dict] = []
    for date_key in dates:
        items = grouped.get(date_key, [])
        calories = 0.0
        protein = 0.0
        carbs = 0.0
        fat = 0.0
        for item in items:
            calories += float(item.get("calories") or 0)
            protein += float(item.get("protein_g") or 0)
            carbs += float(item.get("carbs_g") or 0)
            fat += float(item.get("fat_g") or 0)
        result.append(
            {
                "date": date_key,
                "calories": round(calories, 2),
                "protein": round(protein, 2),
                "carbs": round(carbs, 2),
                "fat": round(fat, 2),
            }
        )
    return result


def _risk_level(probability: float) -> str:
    if probability >= 0.7:
        return "critical"
    if probability >= 0.5:
        return "high"
    if probability >= 0.25:
        return "moderate"
    return "low"


def _risk_trend(probability: float) -> str:
    if probability >= 0.55:
        return "worsening"
    if probability >= 0.3:
        return "stable"
    return "improving"


def _risk_item(
    *,
    risk_id: str,
    condition: str,
    condition_vi: str,
    condition_code: str,
    icd_code: str,
    probability: float,
    factors: list[dict],
    tips: list[dict],
) -> dict:
    return {
        "id": risk_id,
        "condition": condition,
        "conditionVi": condition_vi,
        "conditionCode": condition_code,
        "probability": round(max(0.0, min(probability, 0.99)), 2),
        "level": _risk_level(probability),
        "trend": _risk_trend(probability),
        "factors": factors,
        "tips": tips,
        "icdCode": icd_code,
    }


async def get_risk_summary(db: AsyncSession, user: User) -> dict:
    metrics = await _metrics_in_period(db, user.id, "30d")

    latest_by_type: dict[MetricTypeEnum, float] = {}
    for metric in reversed(metrics):
        latest_by_type[metric.metric_type] = float(metric.value)

    heart_rate = latest_by_type.get(MetricTypeEnum.HEART_RATE)
    systolic = latest_by_type.get(MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC)
    diastolic = latest_by_type.get(MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC)
    steps = latest_by_type.get(MetricTypeEnum.STEPS)
    weight = latest_by_type.get(MetricTypeEnum.WEIGHT_KG)

    bmi = None
    if user.profile and user.profile.height_cm and (weight or user.profile.weight_kg):
        source_weight = weight or user.profile.weight_kg
        bmi = source_weight / ((user.profile.height_cm / 100) ** 2)

    diabetes_prob = 0.15
    if bmi is not None and bmi >= 25:
        diabetes_prob += 0.2
    if steps is not None and steps < 7000:
        diabetes_prob += 0.15

    hypertension_prob = 0.12
    if systolic is not None and systolic >= 130:
        hypertension_prob += 0.28
    if diastolic is not None and diastolic >= 85:
        hypertension_prob += 0.18
    if heart_rate is not None and heart_rate > 95:
        hypertension_prob += 0.1

    obesity_prob = 0.08
    if bmi is not None and bmi >= 27:
        obesity_prob += 0.3
    if steps is not None and steps < 6000:
        obesity_prob += 0.12

    risks = [
        _risk_item(
            risk_id="risk-diabetes",
            condition="Type 2 Diabetes",
            condition_vi="Dai thao duong type 2",
            condition_code="DIABETES_T2",
            icd_code="E11",
            probability=diabetes_prob,
            factors=[
                {
                    "label": "BMI",
                    "impact": "negative" if bmi and bmi >= 25 else "neutral",
                    "detail": f"{round(bmi, 1)}" if bmi is not None else "NO_DATA",
                },
                {
                    "label": "STEPS",
                    "impact": "negative" if steps is not None and steps < 7000 else "positive",
                    "detail": f"{round(steps)}" if steps is not None else "NO_DATA",
                },
            ],
            tips=[
                {
                    "id": "tip-diabetes-activity",
                    "category": "exercise",
                    "title": "tip-diabetes-activity",
                    "description": "tip-diabetes-activity",
                    "priority": "high",
                },
            ],
        ),
        _risk_item(
            risk_id="risk-hypertension",
            condition="Hypertension",
            condition_vi="Tang huyet ap",
            condition_code="HYPERTENSION",
            icd_code="I10",
            probability=hypertension_prob,
            factors=[
                {
                    "label": "SYSTOLIC_BP",
                    "impact": "negative" if systolic is not None and systolic >= 130 else "neutral",
                    "detail": f"{round(systolic)}" if systolic is not None else "NO_DATA",
                },
                {
                    "label": "DIASTOLIC_BP",
                    "impact": "negative" if diastolic is not None and diastolic >= 85 else "neutral",
                    "detail": f"{round(diastolic)}" if diastolic is not None else "NO_DATA",
                },
            ],
            tips=[
                {
                    "id": "tip-hypertension-diet",
                    "category": "diet",
                    "title": "tip-hypertension-diet",
                    "description": "tip-hypertension-diet",
                    "priority": "high",
                },
            ],
        ),
        _risk_item(
            risk_id="risk-obesity",
            condition="Overweight",
            condition_vi="Thua can",
            condition_code="OVERWEIGHT",
            icd_code="E66",
            probability=obesity_prob,
            factors=[
                {
                    "label": "BMI",
                    "impact": "negative" if bmi and bmi >= 25 else "neutral",
                    "detail": f"{round(bmi, 1)}" if bmi is not None else "NO_DATA",
                },
                {
                    "label": "PHYSICAL_ACTIVITY",
                    "impact": "negative" if steps is not None and steps < 6000 else "positive",
                    "detail": f"{round(steps)}" if steps is not None else "NO_DATA",
                },
            ],
            tips=[
                {
                    "id": "tip-obesity-goal",
                    "category": "lifestyle",
                    "title": "tip-obesity-goal",
                    "description": "tip-obesity-goal",
                    "priority": "medium",
                },
            ],
        ),
    ]

    avg_risk = _avg([float(r["probability"]) for r in risks])
    overall_score = max(0, min(100, round((1 - avg_risk) * 100)))

    return {
        "generatedAt": _utc_now().isoformat(),
        "overallScore": overall_score,
        "risks": risks,
        "disclaimer": "RISK_DISCLAIMER",
    }


def _section_status(alerts: list[dict]) -> str:
    if any(alert["severity"] == "critical" for alert in alerts):
        return "critical"
    if alerts:
        return "warning"
    return "normal"


async def get_health_report(
    db: AsyncSession,
    user: User,
    period: str,
) -> dict:
    if period not in REPORT_PERIOD_DAYS:
        period = "7d"

    metrics = await _metrics_in_period(db, user.id, period)
    meals = await _meals_in_period(db, user.id, period)
    reminders = (
        await db.execute(
            select(Reminder).where(
                Reminder.user_id == user.id,
                Reminder.type == ReminderTypeEnum.MEDICINE,
            )
        )
    ).scalars().all()

    heart_rate_points = _daily_metric_series(metrics, MetricTypeEnum.HEART_RATE, period)
    sys_points = _daily_metric_series(metrics, MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC, period)
    dia_points = _daily_metric_series(metrics, MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC, period)
    steps_points = _daily_metric_series(metrics, MetricTypeEnum.STEPS, period)
    sleep_points = _daily_metric_series(metrics, MetricTypeEnum.SLEEP_MINUTES, period)
    weight_points = _daily_metric_series(metrics, MetricTypeEnum.WEIGHT_KG, period)
    meal_points = _daily_meal_totals(meals, period)

    vitals_data: list[dict] = []
    for idx in range(len(heart_rate_points)):
        vitals_data.append(
            {
                "date": heart_rate_points[idx]["date"],
                "value": heart_rate_points[idx]["value"],
                "value2": sys_points[idx]["value"],
                "value3": dia_points[idx]["value"],
            }
        )
    vitals_values = [float(item["value"]) for item in vitals_data if item["value"] > 0]
    vitals_alerts: list[dict] = []
    if vitals_values and vitals_values[-1] > 100:
        vitals_alerts.append(
            {
                "id": "alert-vitals-hr",
                "severity": "warning",
                "metric": "HEART_RATE",
                "message": "HEART_RATE_HIGH",
                "alert_code": "HEART_RATE_HIGH",
                "alert_params": {"value": round(vitals_values[-1], 1), "unit": "bpm", "threshold": 100},
                "value": vitals_values[-1],
                "threshold": 100,
                "unit": "bpm",
                "timestamp": _utc_now().isoformat(),
            }
        )

    nutrition_data = [
        {
            "date": item["date"],
            "value": item["calories"],
            "value2": item["protein"],
            "value3": item["carbs"],
        }
        for item in meal_points
    ]
    nutrition_values = [float(item["value"]) for item in nutrition_data if item["value"] > 0]
    nutrition_alerts: list[dict] = []
    if nutrition_values and nutrition_values[-1] > 2300:
        nutrition_alerts.append(
            {
                "id": "alert-nutrition-calories",
                "severity": "warning",
                "metric": "CALORIES",
                "message": "CALORIE_HIGH",
                "alert_code": "CALORIE_HIGH",
                "alert_params": {"value": round(nutrition_values[-1], 1), "unit": "kcal", "threshold": 2300},
                "value": nutrition_values[-1],
                "threshold": 2300,
                "unit": "kcal",
                "timestamp": _utc_now().isoformat(),
            }
        )

    activity_data = [{"date": item["date"], "value": item["value"]} for item in steps_points]
    activity_values = [float(item["value"]) for item in activity_data if item["value"] > 0]
    activity_alerts: list[dict] = []
    if activity_values and activity_values[-1] < 5000:
        activity_alerts.append(
            {
                "id": "alert-activity-steps",
                "severity": "warning",
                "metric": "STEPS",
                "message": "STEPS_LOW",
                "alert_code": "STEPS_LOW",
                "alert_params": {"value": round(activity_values[-1]), "unit": "steps", "threshold": 5000},
                "value": activity_values[-1],
                "threshold": 5000,
                "unit": "steps",
                "timestamp": _utc_now().isoformat(),
            }
        )

    sleep_data = [
        {"date": item["date"], "value": round(item["value"] / 60.0, 2) if item["value"] else 0}
        for item in sleep_points
    ]
    sleep_values = [float(item["value"]) for item in sleep_data if item["value"] > 0]
    sleep_alerts: list[dict] = []
    if sleep_values and sleep_values[-1] < 6:
        sleep_alerts.append(
            {
                "id": "alert-sleep-low",
                "severity": "critical",
                "metric": "SLEEP",
                "message": "SLEEP_LOW",
                "alert_code": "SLEEP_LOW",
                "alert_params": {"value": round(sleep_values[-1], 1), "unit": "hours", "threshold": 6},
                "value": sleep_values[-1],
                "threshold": 6,
                "unit": "hours",
                "timestamp": _utc_now().isoformat(),
            }
        )

    bmi_data: list[dict] = []
    bmi_values: list[float] = []
    if user.profile and user.profile.height_cm and user.profile.height_cm > 0:
        for item in weight_points:
            value = item["value"]
            if value > 0:
                bmi = value / ((user.profile.height_cm / 100) ** 2)
                bmi_values.append(float(bmi))
                bmi_data.append(
                    {
                        "date": item["date"],
                        "value": round(bmi, 2),
                        "value2": value,
                    }
                )
    bmi_alerts: list[dict] = []
    if bmi_values and bmi_values[-1] >= 25:
        bmi_alerts.append(
            {
                "id": "alert-bmi",
                "severity": "warning",
                "metric": "BMI",
                "message": "BMI_OVERWEIGHT",
                "alert_code": "BMI_OVERWEIGHT",
                "alert_params": {"value": round(bmi_values[-1], 1), "unit": "kg/m2", "threshold": 25},
                "value": bmi_values[-1],
                "threshold": 25,
                "unit": "kg/m2",
                "timestamp": _utc_now().isoformat(),
            }
        )

    medication_data = [
        {"date": date, "value": 0}
        for date in _date_range(period)
    ]
    medication_alerts: list[dict] = []
    if reminders:
        done_count = len([item for item in reminders if item.done])
        adherence = round((done_count / len(reminders)) * 100) if reminders else 0
        medication_data[-1]["value"] = adherence
        if adherence < 80:
            medication_alerts.append(
                {
                    "id": "alert-medication",
                    "severity": "warning",
                    "metric": "MEDICATION",
                    "message": "MEDICATION_ADHERENCE_LOW",
                    "alert_code": "MEDICATION_ADHERENCE_LOW",
                    "alert_params": {"value": adherence, "unit": "%", "threshold": 80},
                    "value": adherence,
                    "threshold": 80,
                    "unit": "%",
                    "timestamp": _utc_now().isoformat(),
                }
            )

    sections = [
        {
            "category": "vitals",
            "section_code": "VITALS",
            "title": "VITALS",
            "summary": "VITALS",
            "status": _section_status(vitals_alerts),
            "data": vitals_data,
            "stats": _safe_stats(vitals_values, "bpm"),
            "alerts": vitals_alerts,
        },
        {
            "category": "nutrition",
            "section_code": "NUTRITION",
            "title": "NUTRITION",
            "summary": "NUTRITION",
            "status": _section_status(nutrition_alerts),
            "data": nutrition_data,
            "stats": _safe_stats(nutrition_values, "kcal"),
            "alerts": nutrition_alerts,
        },
        {
            "category": "activity",
            "section_code": "ACTIVITY",
            "title": "ACTIVITY",
            "summary": "ACTIVITY",
            "status": _section_status(activity_alerts),
            "data": activity_data,
            "stats": _safe_stats(activity_values, "steps"),
            "alerts": activity_alerts,
        },
        {
            "category": "sleep",
            "section_code": "SLEEP",
            "title": "SLEEP",
            "summary": "SLEEP",
            "status": _section_status(sleep_alerts),
            "data": sleep_data,
            "stats": _safe_stats(sleep_values, "gio"),
            "alerts": sleep_alerts,
        },
        {
            "category": "bmi",
            "section_code": "BMI",
            "title": "BMI",
            "summary": "BMI",
            "status": _section_status(bmi_alerts),
            "data": bmi_data,
            "stats": _safe_stats(bmi_values, "kg/m2"),
            "alerts": bmi_alerts,
        },
        {
            "category": "medication",
            "section_code": "MEDICATION",
            "title": "MEDICATION",
            "summary": "MEDICATION",
            "status": _section_status(medication_alerts),
            "data": medication_data,
            "stats": _safe_stats([float(item["value"]) for item in medication_data], "%"),
            "alerts": medication_alerts,
        },
    ]

    status_rank = {"normal": 0, "warning": 1, "critical": 2}
    report_status = "normal"
    for section in sections:
        if status_rank[section["status"]] > status_rank[report_status]:
            report_status = section["status"]

    all_alerts: list[dict] = []
    for section in sections:
        all_alerts.extend(section["alerts"])

    return {
        "id": f"report-{period}-{_utc_now().date().isoformat()}",
        "user_id": str(user.id),
        "period": period,
        "generated_at": _utc_now().isoformat(),
        "status": report_status,
        "sections": sections,
        "alerts": all_alerts,
    }


def _trend_direction(change_percent: int, higher_is_better: bool) -> str:
    if abs(change_percent) < 3:
        return "stable"
    if higher_is_better:
        return "improving" if change_percent > 0 else "declining"
    return "improving" if change_percent < 0 else "declining"


def _trend_line(values: list[float]) -> list[float]:
    if not values:
        return []
    if len(values) == 1:
        return [values[0]]
    n = len(values)
    x_values = list(range(n))
    x_mean = _avg([float(x) for x in x_values])
    y_mean = _avg(values)
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    if denominator == 0:
        return [round(y_mean, 2)] * n
    slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, values)) / denominator
    intercept = y_mean - slope * x_mean
    return [round(intercept + slope * x, 2) for x in x_values]


def _predict_next(values: list[float], count: int = 7) -> list[float]:
    if not values:
        return []
    line = _trend_line(values)
    if len(line) < 2:
        return [round(values[-1], 2)] * count
    slope = line[-1] - line[-2]
    start = line[-1]
    return [round(start + slope * (i + 1), 2) for i in range(count)]


def _find_anomalies(data_points: list[dict], unit: str) -> list[dict]:
    values = [float(point["value"]) for point in data_points if point["value"] > 0]
    if len(values) < 3:
        return []
    baseline = _avg(values)
    if baseline == 0:
        return []

    anomalies: list[dict] = []
    for point in data_points:
        value = float(point["value"])
        if value <= 0:
            continue
        deviation = ((value - baseline) / baseline) * 100
        if abs(deviation) >= 25:
            anomalies.append(
                {
                    "date": point["date"],
                    "value": round(value, 2),
                    "deviation_percent": round(abs(deviation), 2),
                    "severity": "critical" if abs(deviation) >= 40 else "warning",
                    "unit": unit,
                }
            )
    return anomalies


async def get_trend_analysis(
    db: AsyncSession,
    user: User,
    metric: str,
    period: str,
) -> dict:
    if period not in REPORT_PERIOD_DAYS:
        period = "7d"

    metrics = await _metrics_in_period(db, user.id, period)
    meals = await _meals_in_period(db, user.id, period)

    mapping = {
        "heart_rate": {
            "label": "HEART_RATE",
            "unit": "bpm",
            "higher_is_better": False,
            "series": _daily_metric_series(metrics, MetricTypeEnum.HEART_RATE, period),
        },
        "blood_pressure": {
            "label": "SYSTOLIC_BP",
            "unit": "mmHg",
            "higher_is_better": False,
            "series": _daily_metric_series(metrics, MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC, period),
        },
        "steps": {
            "label": "STEPS",
            "unit": "steps",
            "higher_is_better": True,
            "series": _daily_metric_series(metrics, MetricTypeEnum.STEPS, period),
        },
        "sleep": {
            "label": "SLEEP",
            "unit": "hours",
            "higher_is_better": True,
            "series": [
                {"date": item["date"], "value": round(item["value"] / 60.0, 2)}
                for item in _daily_metric_series(metrics, MetricTypeEnum.SLEEP_MINUTES, period)
            ],
        },
        "bmi": {
            "label": "BMI",
            "unit": "kg/m2",
            "higher_is_better": False,
            "series": [],
        },
        "weight": {
            "label": "WEIGHT",
            "unit": "kg",
            "higher_is_better": False,
            "series": _daily_metric_series(metrics, MetricTypeEnum.WEIGHT_KG, period),
        },
        "calories": {
            "label": "CALORIES",
            "unit": "kcal",
            "higher_is_better": True,
            "series": [
                {"date": item["date"], "value": item["calories"]}
                for item in _daily_meal_totals(meals, period)
            ],
        },
    }

    if metric == "bmi" and user.profile and user.profile.height_cm and user.profile.height_cm > 0:
        weight_series = _daily_metric_series(metrics, MetricTypeEnum.WEIGHT_KG, period)
        mapping["bmi"]["series"] = [
            {
                "date": item["date"],
                "value": round(item["value"] / ((user.profile.height_cm / 100) ** 2), 2)
                if item["value"] > 0
                else 0,
            }
            for item in weight_series
        ]

    selected = mapping.get(metric)
    if selected is None:
        selected = mapping["heart_rate"]
        metric = "heart_rate"

    data_points = [
        {"date": item["date"], "value": round(float(item["value"]), 2)}
        for item in selected["series"]
    ]
    values = [point["value"] for point in data_points if point["value"] > 0]

    if len(values) >= 2 and values[0] != 0:
        change_percent = round(((values[-1] - values[0]) / abs(values[0])) * 100)
    else:
        change_percent = 0

    trend = _trend_direction(change_percent, bool(selected["higher_is_better"]))
    trend_line = _trend_line([point["value"] for point in data_points])
    prediction = _predict_next([point["value"] for point in data_points], count=7)
    anomalies = _find_anomalies(data_points, str(selected["unit"]))

    if not values:
        ai_summary = "TREND_NO_DATA"
        ai_summary_params: dict = {}
    else:
        ai_summary = "TREND_SUMMARY"
        ai_summary_params = {
            "metric": selected["label"],
            "period": period,
            "trend": trend,
            "change": change_percent,
        }

    return {
        "metric": metric,
        "metric_label": selected["label"],
        "unit": selected["unit"],
        "period": period,
        "data_points": data_points,
        "trend_line": trend_line,
        "prediction": prediction,
        "anomalies": anomalies,
        "trend": trend,
        "change_percent": change_percent,
        "ai_summary": ai_summary,
        "ai_summary_params": ai_summary_params,
    }

