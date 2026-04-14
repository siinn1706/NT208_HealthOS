from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.common import DataResponse, PaginatedResponse


# ── Enums ────────────────────────────────────────────────────────

class AggregationPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ComparisonPeriod(str, Enum):
    D7 = "7d"
    D30 = "30d"
    D90 = "90d"


# ── Request Schemas ───────────────────────────────────────────────

class HealthMetricCreate(BaseModel):
    metric_type: MetricTypeEnum
    value: float = Field(..., ge=0)
    unit: str
    recorded_at: datetime.datetime
    source: WearableSourceEnum = WearableSourceEnum.MANUAL

    @field_validator("value")
    @classmethod
    def validate_medical_range(cls, v, info):
        metric = info.data.get("metric_type")
        ranges = {
            MetricTypeEnum.HEART_RATE: (20, 300),
            MetricTypeEnum.STEPS: (0, 200000),
            MetricTypeEnum.SLEEP_MINUTES: (0, 1440),
            MetricTypeEnum.WEIGHT_KG: (1, 500),
            MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC: (50, 300),
            MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC: (30, 200),
        }
        if metric and metric in ranges:
            lo, hi = ranges[metric]
            if not (lo <= v <= hi):
                raise ValueError(f"value {v} out of medical range [{lo}, {hi}] for {metric.value}")
        return v


class HealthMetricUpdate(BaseModel):
    # ge=0 prevents negative values; full medical-range validation requires
    # metric_type context which isn't available in a PATCH body
    value: Optional[float] = Field(None, ge=0)
    recorded_at: Optional[datetime.datetime] = None
    source: Optional[WearableSourceEnum] = None


# ── Aggregation Schemas ──────────────────────────────────────────

class MetricAggregatePoint(BaseModel):
    date: str
    avg_value: float
    min_value: float
    max_value: float
    count: int


class AggregationResponse(DataResponse[list[MetricAggregatePoint]]):
    ...


# ── Comparison Schemas ───────────────────────────────────────────

class ComparisonPoint(BaseModel):
    date: str
    values: dict[str, Optional[float]]


class ComparisonResponse(DataResponse[list[ComparisonPoint]]):
    ...


# ── Goal Progress Schemas ─────────────────────────────────────────

class GoalProgressPoint(BaseModel):
    date: str
    value: float
    target: float
    progress_percent: float


class GoalProgressResponse(DataResponse[list[GoalProgressPoint]]):
    ...


# ── Period Comparison Schemas ─────────────────────────────────────

class PeriodStats(BaseModel):
    period: Literal["current", "previous"]
    avg_value: Optional[float]
    min_value: Optional[float]
    max_value: Optional[float]
    total_value: float
    count: int
    trend: Literal["improving", "declining", "stable"]


class PeriodComparisonData(BaseModel):
    current: PeriodStats
    previous: PeriodStats
    change_percent: float


class PeriodComparisonResponse(DataResponse[PeriodComparisonData]):
    ...


# ── Existing (keep for backwards compatibility) ──────────────────

class HealthMetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    metric_type: str
    value: float
    unit: str
    recorded_at: datetime.datetime
    source: str


class HealthMetricListResponse(PaginatedResponse[HealthMetricResponse]):
    ...
