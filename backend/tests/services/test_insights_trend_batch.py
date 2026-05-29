from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest

from app.models.core import MetricTypeEnum
from app.services import insights


_NOW = datetime.datetime(2026, 5, 29, 12, 0, tzinfo=datetime.timezone.utc)


def _user() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        profile=SimpleNamespace(height_cm=170),
    )


def _metric(metric_type: MetricTypeEnum, value: float, days_ago: int) -> SimpleNamespace:
    return SimpleNamespace(
        metric_type=metric_type,
        value=value,
        recorded_at=_NOW - datetime.timedelta(days=days_ago),
    )


def _meal(calories: float, days_ago: int) -> SimpleNamespace:
    return SimpleNamespace(
        nutrition_result={"calories": calories},
        logged_at=_NOW - datetime.timedelta(days=days_ago),
    )


@pytest.fixture(autouse=True)
def fixed_clock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(insights, "_utc_now", lambda: _NOW)


@pytest.mark.asyncio
async def test_trend_batch_preloads_metrics_once_and_preserves_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = {"metrics": 0, "meals": 0}

    async def fake_metrics(*_args: object) -> list[SimpleNamespace]:
        calls["metrics"] += 1
        return [
            _metric(MetricTypeEnum.HEART_RATE, 70, 6),
            _metric(MetricTypeEnum.HEART_RATE, 76, 0),
            _metric(MetricTypeEnum.STEPS, 6000, 6),
            _metric(MetricTypeEnum.STEPS, 8000, 0),
        ]

    async def fake_meals(*_args: object) -> list[SimpleNamespace]:
        calls["meals"] += 1
        return []

    async def fail_single_trend(*_args: object) -> dict:
        raise AssertionError("batch service must not call get_trend_analysis")

    monkeypatch.setattr(insights, "_metrics_in_period", fake_metrics)
    monkeypatch.setattr(insights, "_meals_in_period", fake_meals)
    monkeypatch.setattr(insights, "get_trend_analysis", fail_single_trend)

    result = await insights.get_trend_analysis_batch(
        object(),
        _user(),
        ["steps", "heart_rate", "steps", "unknown"],
        "7d",
    )

    assert list(result) == ["steps", "heart_rate"]
    assert calls == {"metrics": 1, "meals": 0}
    assert result["steps"]["metric"] == "steps"
    assert result["heart_rate"]["metric"] == "heart_rate"


@pytest.mark.asyncio
async def test_trend_batch_loads_meals_only_for_calories(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = {"metrics": 0, "meals": 0}

    async def fake_metrics(*_args: object) -> list[SimpleNamespace]:
        calls["metrics"] += 1
        return []

    async def fake_meals(*_args: object) -> list[SimpleNamespace]:
        calls["meals"] += 1
        return [_meal(420, 0)]

    monkeypatch.setattr(insights, "_metrics_in_period", fake_metrics)
    monkeypatch.setattr(insights, "_meals_in_period", fake_meals)

    no_meal_result = await insights.get_trend_analysis_batch(
        object(),
        _user(),
        ["heart_rate"],
        "7d",
    )
    assert list(no_meal_result) == ["heart_rate"]
    assert calls == {"metrics": 1, "meals": 0}

    calorie_result = await insights.get_trend_analysis_batch(
        object(),
        _user(),
        ["calories"],
        "7d",
    )
    assert list(calorie_result) == ["calories"]
    assert calls == {"metrics": 2, "meals": 1}


@pytest.mark.asyncio
async def test_single_and_batch_payload_match_for_same_metric(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rows = [
        _metric(MetricTypeEnum.HEART_RATE, 70, 6),
        _metric(MetricTypeEnum.HEART_RATE, 77, 0),
    ]

    async def fake_metrics(*_args: object) -> list[SimpleNamespace]:
        return rows

    async def fake_meals(*_args: object) -> list[SimpleNamespace]:
        return []

    monkeypatch.setattr(insights, "_metrics_in_period", fake_metrics)
    monkeypatch.setattr(insights, "_meals_in_period", fake_meals)

    user = _user()
    single = await insights.get_trend_analysis(object(), user, "heart_rate", "7d")
    batch = await insights.get_trend_analysis_batch(object(), user, ["heart_rate"], "7d")

    assert batch["heart_rate"] == single


@pytest.mark.asyncio
async def test_single_trend_keeps_invalid_metric_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_metrics(*_args: object) -> list[SimpleNamespace]:
        return [
            _metric(MetricTypeEnum.HEART_RATE, 70, 6),
            _metric(MetricTypeEnum.HEART_RATE, 77, 0),
        ]

    async def fail_meals(*_args: object) -> list[SimpleNamespace]:
        raise AssertionError("heart_rate fallback should not load meals")

    monkeypatch.setattr(insights, "_metrics_in_period", fake_metrics)
    monkeypatch.setattr(insights, "_meals_in_period", fail_meals)

    result = await insights.get_trend_analysis(object(), _user(), "unknown", "30d")

    assert result["metric"] == "heart_rate"
    assert result["metric_label"] == "HEART_RATE"


@pytest.mark.asyncio
async def test_trend_batch_skips_unsupported_metrics_defensively(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fail_metrics(*_args: object) -> list[SimpleNamespace]:
        raise AssertionError("unsupported-only batches should not query")

    monkeypatch.setattr(insights, "_metrics_in_period", fail_metrics)

    result = await insights.get_trend_analysis_batch(object(), _user(), ["unknown"], "7d")

    assert result == {}
