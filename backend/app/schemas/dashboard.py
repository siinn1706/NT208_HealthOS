from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import DataResponse


class DashboardAlert(BaseModel):
    id: str
    type: str
    message: str


class KpiValue(BaseModel):
    current: float | None = None
    target: float | None = None


class DashboardGoal(BaseModel):
    id: str
    key: str
    current: float | None = None
    target: float | None = None
    unit: str


class DashboardAiInsight(BaseModel):
    text: str
    category: str | None = None


class DashboardSummaryDTO(BaseModel):
    user_name: str
    alerts: list[DashboardAlert]
    kpis: dict[str, KpiValue]
    goals: list[DashboardGoal]
    ai_insight: DashboardAiInsight | None = None


class VitalPointDTO(BaseModel):
    date: str
    heart_rate: float | None = None
    systolic: float | None = None
    diastolic: float | None = None


class NutritionSuggestionDTO(BaseModel):
    id: str
    type: str
    icon: str
    title: str
    message: str
    priority: int
    cta: dict[str, str] | None = None


class DashboardSummaryResponse(DataResponse[DashboardSummaryDTO]):
    ...


class VitalsTimeseriesResponse(DataResponse[list[VitalPointDTO]]):
    ...


class NutritionSuggestionsResponse(DataResponse[list[NutritionSuggestionDTO]]):
    ...

