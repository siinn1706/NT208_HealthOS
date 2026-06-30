from __future__ import annotations

import asyncio
import datetime
import hashlib
import json
import logging
import time
import uuid
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters import redis_client
from app.core.config import settings
from app.models.core import MetricTypeEnum, User
from app.schemas.dashboard import (
    DashboardAiAdviceActionDTO,
    DashboardAiAdviceDTO,
    DashboardAiAdviceEvidenceDTO,
    DashboardAiAdviceRagSourceDTO,
)
from app.services import ai_chat_context, dashboard as dashboard_svc, medical_rag

_LOGGER = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 45 * 60
_LATEST_CACHE_TTL_SECONDS = 2 * 60 * 60
_LIVE_AI_TIMEOUT_SECONDS = 3.0
_THROTTLE_WINDOW_SECONDS = 60
_THROTTLE_MAX_CALLS = 4
_HASH_LENGTH = 16

_ALLOWED_CATEGORIES = {"nutrition", "activity", "sleep", "vitals", "medication", "general"}
_ALLOWED_PRIORITIES = {"low", "medium", "high"}
_ALLOWED_ACTION_TYPES = {
    "log_meal",
    "walk",
    "sleep_hygiene",
    "view_trends",
    "open_chat",
    "track_vitals",
}
_UNSAFE_TEXT_MARKERS = (
    "diagnose",
    "prescribe",
    "change medication",
    "stop medication",
    "increase dose",
    "decrease dose",
    "chẩn đoán",
    "kê đơn",
    "đổi liều",
    "ngừng thuốc",
    "tăng liều",
    "giảm liều",
)


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(value: datetime.datetime) -> str:
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_locale(locale: str | None) -> str:
    return "en" if (locale or "").strip().lower().startswith("en") else "vi"


def _normalize_surface(surface: str | None) -> str:
    return "mobile" if (surface or "").strip().lower() == "mobile" else "web"


def _safe_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value == value and value not in (float("inf"), float("-inf")):
        return float(value)
    return None


def _first_number(*values: Any) -> float | None:
    for value in values:
        number = _safe_number(value)
        if number is not None:
            return number
    return None


def _compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def _context_hash(context: dict[str, Any]) -> str:
    return hashlib.sha256(_compact_json(context).encode("utf-8")).hexdigest()[:_HASH_LENGTH]


def _cache_key(user_id: uuid.UUID, locale: str, context_hash: str) -> str:
    return f"ai:dashboard_advice:{user_id}:{locale}:{context_hash}"


def _latest_cache_key(user_id: uuid.UUID, locale: str) -> str:
    return f"ai:dashboard_advice:latest:{user_id}:{locale}"


def _throttle_key(user_id: uuid.UUID) -> str:
    return f"rate:dashboard_ai_advice:user:{user_id}"


def _disclaimer(locale: str) -> str:
    if locale == "en":
        return (
            "HealthOS AI advice is informational only and does not replace care "
            "from a licensed clinician."
        )
    return (
        "Gợi ý AI của HealthOS chỉ mang tính tham khảo, không thay thế tư vấn "
        "của nhân viên y tế có chuyên môn."
    )


def _metric_label(metric: str, locale: str) -> str:
    labels = {
        "vi": {
            "steps": "Bước chân",
            "calories": "Calo hôm nay",
            "sleep": "Giấc ngủ",
            "heart_rate": "Nhịp tim",
            "blood_pressure": "Huyết áp",
            "meal_logs": "Bữa ăn đã ghi",
        },
        "en": {
            "steps": "Steps",
            "calories": "Today's calories",
            "sleep": "Sleep",
            "heart_rate": "Heart rate",
            "blood_pressure": "Blood pressure",
            "meal_logs": "Logged meals",
        },
    }
    return labels[locale].get(metric, metric)


def _sanitize_profile(profile: Any) -> dict[str, Any]:
    if not isinstance(profile, dict):
        return {}
    allowed = ("age_years", "gender", "blood_type", "height_cm", "weight_kg", "bmi")
    return {key: profile[key] for key in allowed if profile.get(key) not in (None, "", [])}


def _sanitize_risks(risks: Any) -> list[dict[str, Any]]:
    if not isinstance(risks, list):
        return []
    safe: list[dict[str, Any]] = []
    for risk in risks[:3]:
        if not isinstance(risk, dict):
            continue
        safe.append({
            "condition": risk.get("condition"),
            "level": risk.get("level"),
            "probability": risk.get("probability"),
        })
    return safe


async def _latest_snapshot(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    metrics = await dashboard_svc._latest_metrics(db, user_id)
    today_meals = await dashboard_svc._today_meals(db, user_id)
    steps = dashboard_svc._latest_metric_value(metrics, MetricTypeEnum.STEPS)
    sleep_minutes = dashboard_svc._latest_metric_value(metrics, MetricTypeEnum.SLEEP_MINUTES)
    heart_rate = dashboard_svc._latest_metric_value(metrics, MetricTypeEnum.HEART_RATE)
    systolic = dashboard_svc._latest_metric_value(metrics, MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC)
    diastolic = dashboard_svc._latest_metric_value(metrics, MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC)

    return {
        "latest": {
            "steps": steps,
            "sleep_minutes": sleep_minutes,
            "heart_rate_bpm": heart_rate,
            "systolic_mmhg": systolic,
            "diastolic_mmhg": diastolic,
        },
        "today_meals": {
            "meals_logged": len(today_meals),
            "calories": round(dashboard_svc._sum_nutrition_value(today_meals, "calories"), 1),
            "protein_g": round(dashboard_svc._sum_nutrition_value(today_meals, "protein_g"), 1),
            "carbs_g": round(dashboard_svc._sum_nutrition_value(today_meals, "carbs_g"), 1),
            "fat_g": round(dashboard_svc._sum_nutrition_value(today_meals, "fat_g"), 1),
        },
    }


async def _build_advice_context(db: AsyncSession, user: User) -> dict[str, Any]:
    raw_context = await ai_chat_context.build_user_context(db, user)
    raw_context = raw_context if isinstance(raw_context, dict) else {}
    snapshot = await _latest_snapshot(db, user.id)
    return {
        "profile": _sanitize_profile(raw_context.get("profile")),
        "health_goals": raw_context.get("health_goals") if isinstance(raw_context.get("health_goals"), dict) else None,
        "recent_vitals_7d": raw_context.get("recent_vitals_7d") if isinstance(raw_context.get("recent_vitals_7d"), dict) else {},
        "recent_meals_3d": raw_context.get("recent_meals_3d") if isinstance(raw_context.get("recent_meals_3d"), dict) else {},
        "active_medicine_reminders": raw_context.get("active_medicine_reminders") or 0,
        "risk_summary": _sanitize_risks(raw_context.get("risk_summary")),
        **snapshot,
    }


def _num_from_path(context: dict[str, Any], *keys: str) -> float | None:
    value: Any = context
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return _safe_number(value)


def _dominant_signal(context: dict[str, Any]) -> str:
    latest = context.get("latest") if isinstance(context.get("latest"), dict) else {}
    today_meals = context.get("today_meals") if isinstance(context.get("today_meals"), dict) else {}
    vitals_7d = context.get("recent_vitals_7d") if isinstance(context.get("recent_vitals_7d"), dict) else {}
    meals_3d = context.get("recent_meals_3d") if isinstance(context.get("recent_meals_3d"), dict) else {}

    steps = _first_number(latest.get("steps"), vitals_7d.get("steps_avg_per_day"))
    sleep_minutes = _safe_number(latest.get("sleep_minutes"))
    sleep_hours = _safe_number(vitals_7d.get("sleep_avg_hours"))
    heart_rate = _first_number(latest.get("heart_rate_bpm"), vitals_7d.get("heart_rate_avg_bpm"))
    systolic = _first_number(latest.get("systolic_mmhg"), vitals_7d.get("systolic_avg_mmhg"))
    diastolic = _first_number(latest.get("diastolic_mmhg"), vitals_7d.get("diastolic_avg_mmhg"))
    calories_today = _safe_number(today_meals.get("calories")) or 0.0
    calories_3d = _safe_number(meals_3d.get("calories_total_3d"))
    meals_logged_3d = _safe_number(meals_3d.get("meals_logged_3d")) or 0.0
    calories_avg = calories_3d / max(meals_logged_3d, 1.0) if calories_3d is not None else 0.0

    if (heart_rate is not None and heart_rate > 100) or (systolic is not None and systolic >= 140) or (diastolic is not None and diastolic >= 90):
        return "vitals"
    if (sleep_minutes is not None and sleep_minutes < 360) or (sleep_hours is not None and sleep_hours < 6):
        return "sleep"
    if (calories_today > 2200 or calories_avg > 2200) and steps is not None and steps < 5000:
        return "high_calories_low_steps"
    if calories_today > 2200 or calories_avg > 2200:
        return "nutrition"
    if steps is not None and steps < 5000:
        return "activity"
    if not any(
        value not in (None, 0, 0.0, {}, [])
        for value in (steps, sleep_minutes, heart_rate, systolic, diastolic, calories_today, calories_3d)
    ):
        return "no_data"
    return "general"


def _category_for_signal(signal: str) -> str:
    return {
        "high_calories_low_steps": "activity",
        "nutrition": "nutrition",
        "activity": "activity",
        "sleep": "sleep",
        "vitals": "vitals",
        "no_data": "general",
    }.get(signal, "general")


def _priority_for_signal(signal: str) -> str:
    if signal == "vitals":
        return "high"
    if signal in {"high_calories_low_steps", "sleep", "nutrition", "activity"}:
        return "medium"
    return "low"


def _evidence_for_signal(context: dict[str, Any], signal: str, locale: str) -> list[DashboardAiAdviceEvidenceDTO]:
    evidence: list[DashboardAiAdviceEvidenceDTO] = []
    steps = _first_number(
        _num_from_path(context, "latest", "steps"),
        _num_from_path(context, "recent_vitals_7d", "steps_avg_per_day"),
    )
    calories = _num_from_path(context, "today_meals", "calories")
    sleep_minutes = _num_from_path(context, "latest", "sleep_minutes")
    heart_rate = _first_number(
        _num_from_path(context, "latest", "heart_rate_bpm"),
        _num_from_path(context, "recent_vitals_7d", "heart_rate_avg_bpm"),
    )
    systolic = _first_number(
        _num_from_path(context, "latest", "systolic_mmhg"),
        _num_from_path(context, "recent_vitals_7d", "systolic_avg_mmhg"),
    )
    diastolic = _first_number(
        _num_from_path(context, "latest", "diastolic_mmhg"),
        _num_from_path(context, "recent_vitals_7d", "diastolic_avg_mmhg"),
    )
    meals_logged = _num_from_path(context, "today_meals", "meals_logged")

    if signal in {"high_calories_low_steps", "activity"} and steps is not None:
        evidence.append(DashboardAiAdviceEvidenceDTO(
            metric=_metric_label("steps", locale),
            value=round(steps),
            unit="steps",
            comparison="< 5,000" if steps < 5000 else None,
        ))
    if signal in {"high_calories_low_steps", "nutrition"} and calories is not None and calories > 0:
        evidence.append(DashboardAiAdviceEvidenceDTO(
            metric=_metric_label("calories", locale),
            value=round(calories),
            unit="kcal",
            comparison="> 2,200" if calories > 2200 else None,
        ))
    if signal == "sleep" and sleep_minutes is not None:
        evidence.append(DashboardAiAdviceEvidenceDTO(
            metric=_metric_label("sleep", locale),
            value=round(sleep_minutes / 60.0, 1),
            unit="h",
            comparison="< 6h" if sleep_minutes < 360 else None,
        ))
    if signal == "vitals":
        if heart_rate is not None:
            evidence.append(DashboardAiAdviceEvidenceDTO(
                metric=_metric_label("heart_rate", locale),
                value=round(heart_rate),
                unit="bpm",
                comparison="> 100" if heart_rate > 100 else None,
            ))
        if systolic is not None or diastolic is not None:
            bp = f"{round(systolic) if systolic is not None else '-'}/{round(diastolic) if diastolic is not None else '-'}"
            evidence.append(DashboardAiAdviceEvidenceDTO(
                metric=_metric_label("blood_pressure", locale),
                value=bp,
                unit="mmHg",
                comparison=">= 140/90" if (systolic or 0) >= 140 or (diastolic or 0) >= 90 else None,
            ))
    if signal == "no_data":
        evidence.append(DashboardAiAdviceEvidenceDTO(
            metric=_metric_label("meal_logs", locale),
            value=round(meals_logged or 0),
            unit=None,
            comparison=None,
        ))
    return evidence


def _actions_for_signal(signal: str, locale: str) -> list[DashboardAiAdviceActionDTO]:
    labels = {
        "vi": {
            "log_meal": "Ghi bữa ăn",
            "walk": "Đi bộ nhẹ",
            "sleep_hygiene": "Xem báo cáo giấc ngủ",
            "view_trends": "Xem xu hướng",
            "open_chat": "Hỏi HealthOS AI",
            "track_vitals": "Ghi sinh hiệu",
        },
        "en": {
            "log_meal": "Log meal",
            "walk": "Take a light walk",
            "sleep_hygiene": "View sleep report",
            "view_trends": "View trends",
            "open_chat": "Ask HealthOS AI",
            "track_vitals": "Log vitals",
        },
    }
    action_types = {
        "high_calories_low_steps": ["walk", "view_trends"],
        "activity": ["walk", "view_trends"],
        "nutrition": ["log_meal", "view_trends"],
        "sleep": ["sleep_hygiene", "open_chat"],
        "vitals": ["track_vitals", "view_trends"],
        "no_data": ["log_meal", "track_vitals"],
    }.get(signal, ["view_trends", "open_chat"])
    return [
        DashboardAiAdviceActionDTO(id=f"advice-{action_type}", label=labels[locale][action_type], type=action_type)
        for action_type in action_types
    ]


def _rule_copy(signal: str, locale: str) -> tuple[str, str]:
    vi = {
        "high_calories_low_steps": (
            "Nên vận động nhẹ sau bữa ăn",
            "Hôm nay lượng calo đã ghi khá cao trong khi bước chân còn thấp. Nếu bạn thấy khoẻ, hãy đi bộ nhẹ 10-20 phút và theo dõi lại xu hướng hoạt động.",
        ),
        "activity": (
            "Bước chân hôm nay còn thấp",
            "Bạn có thể chia nhỏ vài lượt đi bộ nhẹ trong ngày. Dừng lại nếu đau ngực, khó thở, chóng mặt hoặc có triệu chứng bất thường.",
        ),
        "nutrition": (
            "Kiểm tra lại khẩu phần hôm nay",
            "Lượng calo đã ghi cao hơn ngưỡng tham chiếu. Hãy xem lại chi tiết bữa ăn và ưu tiên nước, rau, đạm nạc trong bữa tiếp theo.",
        ),
        "sleep": (
            "Ưu tiên ngủ sớm hơn tối nay",
            "Dữ liệu gần đây cho thấy thời lượng ngủ thấp. Tối nay hãy giảm màn hình trước giờ ngủ, giữ phòng mát và cố định giờ đi ngủ.",
        ),
        "vitals": (
            "Theo dõi sinh hiệu trước khi vận động",
            "Một vài chỉ số sinh hiệu đang cao hơn ngưỡng tham chiếu. Hãy nghỉ ngơi, đo lại khi bình tĩnh và liên hệ nhân viên y tế nếu chỉ số vẫn cao hoặc có triệu chứng đáng lo.",
        ),
        "no_data": (
            "Ghi thêm dữ liệu để AI tư vấn sát hơn",
            "HealthOS chưa có đủ tín hiệu gần đây. Hãy ghi bữa ăn, bước chân, giấc ngủ hoặc sinh hiệu để nhận gợi ý cá nhân hoá hơn.",
        ),
        "general": (
            "Các tín hiệu hiện tại khá ổn",
            "Tiếp tục duy trì thói quen ghi dữ liệu hằng ngày. Nếu có mục tiêu cụ thể, hãy xem xu hướng để chọn bước tiếp theo phù hợp.",
        ),
    }
    en = {
        "high_calories_low_steps": (
            "Consider gentle movement after meals",
            "Today's logged calories are high while steps are still low. If you feel well, take a light 10-20 minute walk and review your activity trend later.",
        ),
        "activity": (
            "Today's step count is still low",
            "Try a few short, easy walks across the day. Stop if you feel chest pain, shortness of breath, dizziness, or unusual symptoms.",
        ),
        "nutrition": (
            "Review today's portions",
            "Logged calories are above the reference threshold. Review meal details and favor water, vegetables, and lean protein next.",
        ),
        "sleep": (
            "Prioritize an earlier bedtime",
            "Recent data points to low sleep duration. Reduce screen time before bed, keep the room cool, and aim for a consistent bedtime tonight.",
        ),
        "vitals": (
            "Check vitals before exercise",
            "Some vital signs are above reference thresholds. Rest, recheck when calm, and contact a clinician if readings stay high or symptoms concern you.",
        ),
        "no_data": (
            "Log more data for sharper advice",
            "HealthOS does not have enough recent signals yet. Log meals, steps, sleep, or vitals to get more personalized advice.",
        ),
        "general": (
            "Current signals look steady",
            "Keep logging daily health data. If you have a specific goal, review your trends to choose the next practical step.",
        ),
    }
    table = en if locale == "en" else vi
    return table.get(signal, table["general"])


def _rule_advice(
    *,
    context_hash: str,
    signal: str,
    locale: str,
    source: str,
    evidence: list[DashboardAiAdviceEvidenceDTO],
    rag_sources: list[DashboardAiAdviceRagSourceDTO] | None = None,
) -> DashboardAiAdviceDTO:
    now = _utc_now()
    title, body = _rule_copy(signal, locale)
    return DashboardAiAdviceDTO(
        id=f"{source}-{signal}-{context_hash[:8]}",
        status="fallback" if source == "rule" else "ready",
        category=_category_for_signal(signal),
        priority=_priority_for_signal(signal),
        title=title,
        body=body,
        actions=_actions_for_signal(signal, locale),
        evidence=evidence,
        source=source,
        rag_sources=rag_sources or [],
        generated_at=_iso(now),
        expires_at=_iso(now + datetime.timedelta(seconds=_CACHE_TTL_SECONDS)),
        disclaimer=_disclaimer(locale),
    )


def _rag_query(signal: str) -> str:
    return {
        "high_calories_low_steps": "physical activity low steps high calorie intake",
        "activity": "physical activity low steps adults",
        "nutrition": "healthy diet high calorie intake",
        "sleep": "sleep hygiene screen use late bedtime",
        "vitals": "blood pressure high physical activity safe",
        "no_data": "preventive health tracking lifestyle activity diet sleep",
    }.get(signal, "healthy lifestyle activity diet sleep adults")


async def _retrieve_rag(db: AsyncSession, signal: str, locale: str) -> dict[str, Any]:
    try:
        result = await medical_rag.retrieve_medical_context(
            db,
            _rag_query(signal),
            locale,
            top_k=3,
        )
        return medical_rag.rag_result_to_payload(result)
    except Exception as exc:  # noqa: BLE001 - advice must degrade safely
        _LOGGER.debug("dashboard_ai_advice_rag_failed reason=%s", exc)
        return {"sources": [], "limited": True, "reason": "retrieval_failed"}


def _rag_source_metadata(rag_context: dict[str, Any]) -> list[DashboardAiAdviceRagSourceDTO]:
    raw_sources = rag_context.get("sources") if isinstance(rag_context, dict) else []
    if not isinstance(raw_sources, list):
        return []
    safe: list[DashboardAiAdviceRagSourceDTO] = []
    for source in raw_sources[:3]:
        if not isinstance(source, dict):
            continue
        title = str(source.get("title") or "").strip()
        organization = str(source.get("organization") or "").strip()
        url = str(source.get("url") or "").strip()
        if title or organization or url:
            safe.append(DashboardAiAdviceRagSourceDTO(title=title, organization=organization, url=url))
    return safe


async def _read_cached_advice(key: str) -> DashboardAiAdviceDTO | None:
    try:
        redis = await redis_client.get_redis()
        cached = await redis.get(key)
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("dashboard_ai_advice_cache_read_failed reason=%s", exc)
        return None
    if not cached:
        return None
    try:
        advice = DashboardAiAdviceDTO(**json.loads(cached))
        return advice.model_copy(update={"source": "cache"})
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("dashboard_ai_advice_cache_parse_failed reason=%s", exc)
        return None


async def _write_cached_advice(keys: list[str], advice: DashboardAiAdviceDTO) -> None:
    try:
        redis = await redis_client.get_redis()
        payload = json.dumps(advice.model_dump(), ensure_ascii=False, default=str)
        for key in keys:
            ttl = _LATEST_CACHE_TTL_SECONDS if ":latest:" in key else _CACHE_TTL_SECONDS
            await redis.setex(key, ttl, payload)
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("dashboard_ai_advice_cache_write_failed reason=%s", exc)


async def _throttle_allows_live_ai(user_id: uuid.UUID) -> bool:
    try:
        redis = await redis_client.get_redis()
        key = _throttle_key(user_id)
        count = await redis.incr(key)
        if int(count) == 1:
            await redis.expire(key, _THROTTLE_WINDOW_SECONDS)
        return int(count) <= _THROTTLE_MAX_CALLS
    except Exception as exc:  # noqa: BLE001
        _LOGGER.debug("dashboard_ai_advice_throttle_failed reason=%s", exc)
        return True


def _has_unsafe_text(advice: DashboardAiAdviceDTO) -> bool:
    text = " ".join([advice.title, advice.body, *(action.label for action in advice.actions)]).lower()
    return any(marker in text for marker in _UNSAFE_TEXT_MARKERS)


def _normalize_ai_actions(raw_actions: Any, locale: str) -> list[dict[str, Any]]:
    if not isinstance(raw_actions, list):
        return [action.model_dump() for action in _actions_for_signal("general", locale)[:1]]
    normalized: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_actions[:3]):
        if not isinstance(raw, dict):
            continue
        action_type = raw.get("type") if raw.get("type") in _ALLOWED_ACTION_TYPES else "view_trends"
        label = str(raw.get("label") or "").strip()[:80]
        if not label:
            label = action_type.replace("_", " ").title()
        normalized.append({
            "id": str(raw.get("id") or f"ai-action-{index + 1}")[:80],
            "label": label,
            "route": raw.get("route") if isinstance(raw.get("route"), str) else None,
            "type": action_type,
        })
    return normalized or [action.model_dump() for action in _actions_for_signal("general", locale)[:1]]


def _coerce_ai_advice(
    raw: dict[str, Any],
    *,
    context_hash: str,
    signal: str,
    locale: str,
    evidence: list[DashboardAiAdviceEvidenceDTO],
    rag_sources: list[DashboardAiAdviceRagSourceDTO],
) -> DashboardAiAdviceDTO:
    payload = raw.get("advice") if isinstance(raw.get("advice"), dict) else raw
    if not isinstance(payload, dict):
        raise ValueError("AI advice response was not an object")
    now = _utc_now()
    category = payload.get("category") if payload.get("category") in _ALLOWED_CATEGORIES else _category_for_signal(signal)
    priority = payload.get("priority") if payload.get("priority") in _ALLOWED_PRIORITIES else _priority_for_signal(signal)
    advice = DashboardAiAdviceDTO(
        id=str(payload.get("id") or f"ai-{signal}-{context_hash[:8]}")[:100],
        status="ready",
        category=category,
        priority=priority,
        title=str(payload.get("title") or "").strip()[:120],
        body=str(payload.get("body") or "").strip()[:600],
        actions=[DashboardAiAdviceActionDTO(**item) for item in _normalize_ai_actions(payload.get("actions"), locale)],
        evidence=evidence,
        source="ai",
        rag_sources=rag_sources,
        generated_at=str(payload.get("generated_at") or _iso(now)),
        expires_at=str(payload.get("expires_at") or _iso(now + datetime.timedelta(seconds=_CACHE_TTL_SECONDS))),
        disclaimer=str(payload.get("disclaimer") or _disclaimer(locale)).strip()[:240],
    )
    if not advice.title or not advice.body:
        raise ValueError("AI advice response is missing title/body")
    if _has_unsafe_text(advice):
        raise ValueError("AI advice response contained unsafe medical guidance")
    return advice


async def _call_ai_worker_health_advice(
    *,
    context: dict[str, Any],
    signal: str,
    evidence: list[DashboardAiAdviceEvidenceDTO],
    rag_context: dict[str, Any],
    locale: str,
    surface: str,
) -> dict[str, Any]:
    url = f"{settings.ai_worker_url.rstrip('/')}/api/ai/health-advice"
    timeout_seconds = min(float(settings.ai_worker_timeout_seconds or _LIVE_AI_TIMEOUT_SECONDS), _LIVE_AI_TIMEOUT_SECONDS)
    timeout = httpx.Timeout(timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            url,
            json={
                "user_context": context,
                "dominant_signal": signal,
                "evidence": [item.model_dump() for item in evidence],
                "rag_context": rag_context,
                "locale": locale,
                "surface": surface,
            },
        )
        response.raise_for_status()
        return response.json()


async def get_dashboard_ai_advice(
    *,
    db: AsyncSession,
    user: User,
    locale: str = "vi",
    surface: str = "web",
) -> DashboardAiAdviceDTO:
    normalized_locale = _normalize_locale(locale)
    normalized_surface = _normalize_surface(surface)
    context = await _build_advice_context(db, user)
    context_hash = _context_hash(context)
    cache_key = _cache_key(user.id, normalized_locale, context_hash)
    latest_key = _latest_cache_key(user.id, normalized_locale)
    cached = await _read_cached_advice(cache_key)
    if cached is not None:
        return cached

    signal = _dominant_signal(context)
    evidence = _evidence_for_signal(context, signal, normalized_locale)
    rag_context = await _retrieve_rag(db, signal, normalized_locale)
    rag_sources = _rag_source_metadata(rag_context)

    if not await _throttle_allows_live_ai(user.id):
        latest = await _read_cached_advice(latest_key)
        if latest is not None:
            return latest
        return _rule_advice(
            context_hash=context_hash,
            signal=signal,
            locale=normalized_locale,
            source="rule",
            evidence=evidence,
            rag_sources=rag_sources,
        )

    started = time.perf_counter()
    try:
        raw = await asyncio.wait_for(
            _call_ai_worker_health_advice(
                context=context,
                signal=signal,
                evidence=evidence,
                rag_context=rag_context,
                locale=normalized_locale,
                surface=normalized_surface,
            ),
            timeout=_LIVE_AI_TIMEOUT_SECONDS + 0.25,
        )
        advice = _coerce_ai_advice(
            raw,
            context_hash=context_hash,
            signal=signal,
            locale=normalized_locale,
            evidence=evidence,
            rag_sources=rag_sources,
        )
        await _write_cached_advice([cache_key, latest_key], advice)
        _LOGGER.info(
            "dashboard_ai_advice_success duration_ms=%.1f locale=%s surface=%s signal=%s",
            (time.perf_counter() - started) * 1000.0,
            normalized_locale,
            normalized_surface,
            signal,
        )
        return advice
    except Exception as exc:  # noqa: BLE001
        _LOGGER.warning(
            "dashboard_ai_advice_failed reason=%s duration_ms=%.1f locale=%s surface=%s fallback=rule",
            exc,
            (time.perf_counter() - started) * 1000.0,
            normalized_locale,
            normalized_surface,
        )
        return _rule_advice(
            context_hash=context_hash,
            signal=signal,
            locale=normalized_locale,
            source="rule",
            evidence=evidence,
            rag_sources=rag_sources,
        )
