"""Unit tests for health_metrics aggregation service functions."""

import pytest
import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.models.core import MetricTypeEnum
from app.services.health_metrics import (
    aggregate_by_period,
    compare_metrics,
    calculate_goal_progress,
    compare_periods,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


# ── aggregate_by_period Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_aggregate_by_period_daily(mock_db, user_id):
    """Daily aggregation groups by calendar day."""
    mock_row_1 = MagicMock()
    mock_row_1.period_start = datetime(2026, 3, 23, tzinfo=timezone.utc)
    mock_row_1.avg_value = 72.5
    mock_row_1.min_value = 65.0
    mock_row_1.max_value = 80.0
    mock_row_1.count = 10

    mock_row_2 = MagicMock()
    mock_row_2.period_start = datetime(2026, 3, 24, tzinfo=timezone.utc)
    mock_row_2.avg_value = 75.0
    mock_row_2.min_value = 68.0
    mock_row_2.max_value = 82.0
    mock_row_2.count = 8

    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row_1, mock_row_2]
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await aggregate_by_period(
        mock_db, user_id, MetricTypeEnum.HEART_RATE, "daily",
        date(2026, 3, 23), date(2026, 3, 24)
    )

    assert len(result) == 2
    assert result[0]["date"] == "2026-03-23"
    assert result[0]["avg_value"] == 72.5
    assert result[0]["count"] == 10


@pytest.mark.asyncio
async def test_aggregate_by_period_empty(mock_db, user_id):
    """Empty result returns empty list."""
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await aggregate_by_period(
        mock_db, user_id, MetricTypeEnum.HEART_RATE, "daily",
        date(2026, 3, 1), date(2026, 3, 7)
    )

    assert result == []


# ── compare_metrics Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_compare_metrics_requires_two_or_more(mock_db, user_id):
    """compare_metrics raises ValueError with fewer than 2 metrics."""
    with pytest.raises(ValueError, match="At least 2 metric types"):
        await compare_metrics(
            mock_db, user_id,
            [MetricTypeEnum.HEART_RATE],
            date(2026, 3, 1), date(2026, 3, 7)
        )


@pytest.mark.asyncio
async def test_compare_metrics_enforces_limit(mock_db, user_id):
    """More than 4 metrics raises ValueError."""
    with pytest.raises(ValueError, match="At most 4"):
        await compare_metrics(
            mock_db, user_id, [
                MetricTypeEnum.HEART_RATE,
                MetricTypeEnum.STEPS,
                MetricTypeEnum.SLEEP_MINUTES,
                MetricTypeEnum.WEIGHT_KG,
                MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
            ],
            date(2026, 3, 1), date(2026, 3, 7)
        )


# ── calculate_goal_progress Tests ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_calculate_goal_progress_steps(mock_db, user_id):
    """Steps use SUM per day."""
    mock_row_1 = MagicMock()
    mock_row_1.d = date(2026, 3, 23)
    mock_row_1.daily_value = 8500.0

    mock_row_2 = MagicMock()
    mock_row_2.d = date(2026, 3, 24)
    mock_row_2.daily_value = 10200.0

    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row_1, mock_row_2]
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await calculate_goal_progress(
        mock_db, user_id, MetricTypeEnum.STEPS, 10000.0,
        date(2026, 3, 23), date(2026, 3, 24)
    )

    assert len(result) == 2
    assert result[0]["progress_percent"] == 85.0
    assert result[1]["progress_percent"] == 102.0


@pytest.mark.asyncio
async def test_calculate_goal_progress_zero_target(mock_db, user_id):
    """Zero target returns None for progress_percent (not division error)."""
    mock_row = MagicMock()
    mock_row.d = date(2026, 3, 23)
    mock_row.daily_value = 8500.0

    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row]
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await calculate_goal_progress(
        mock_db, user_id, MetricTypeEnum.STEPS, 0,
        date(2026, 3, 23), date(2026, 3, 23)
    )

    assert result[0]["progress_percent"] is None


# ── compare_periods Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_compare_periods_improving(mock_db, user_id):
    """20% improvement shows 'improving' trend."""
    def make_mock_result(vals: list[float]):
        mock = MagicMock()
        mock.mappings.return_value.one_or_none.return_value = MagicMock(
            avg=sum(vals)/len(vals) if vals else 0,
            min=min(vals) if vals else 0,
            max=max(vals) if vals else 0,
            total=sum(vals),
            count=len(vals),
        ) if vals else None
        return mock

    current_mock = make_mock_result([75, 78, 80])
    previous_mock = make_mock_result([60, 62, 65])

    call_count = 0
    async def mock_execute(stmt):
        nonlocal call_count
        call_count += 1
        return current_mock if call_count == 1 else previous_mock

    mock_db.execute = mock_execute

    result = await compare_periods(
        mock_db, user_id, MetricTypeEnum.HEART_RATE, 7
    )

    assert result["change_percent"] > 0
    assert result["current"]["trend"] == "improving"


@pytest.mark.asyncio
async def test_compare_periods_divide_by_zero(mock_db, user_id):
    """Zero previous avg shows 0% change (not division error)."""
    def make_mock_result(vals: list[float]):
        mock = MagicMock()
        mock.mappings.return_value.one_or_none.return_value = MagicMock(
            avg=sum(vals)/len(vals) if vals else 0,
            min=min(vals) if vals else 0,
            max=max(vals) if vals else 0,
            total=sum(vals),
            count=len(vals),
        ) if vals else None
        return mock

    current_mock = make_mock_result([72, 75])
    previous_mock = make_mock_result([])

    call_count = 0
    async def mock_execute(stmt):
        nonlocal call_count
        call_count += 1
        return current_mock if call_count == 1 else previous_mock

    mock_db.execute = mock_execute

    result = await compare_periods(mock_db, user_id, MetricTypeEnum.HEART_RATE, 7)
    assert result["change_percent"] == 0
