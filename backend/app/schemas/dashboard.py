from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import DataResponse


class DashboardAlert(BaseModel):
    id: str
    type: str
    message: str
    alert_code: str | None = None
    alert_params: dict | None = None


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
    insight_code: str | None = None
    insight_params: dict | None = None


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


class ExtendedVitalPointDTO(BaseModel):
    date: str
    heart_rate: float | None = None
    systolic: float | None = None
    diastolic: float | None = None
    steps: float | None = None
    sleep_minutes: float | None = None
    weight_kg: float | None = None


class ExtendedVitalsTimeseriesResponse(DataResponse[list[ExtendedVitalPointDTO]]):
    ...


class NutritionSuggestionDTO(BaseModel):
    id: str
    type: str
    icon: str
    title: str
    message: str
    message_params: dict[str, int] | None = None
    priority: int
    cta: dict[str, str] | None = None


class DashboardSummaryResponse(DataResponse[DashboardSummaryDTO]):
    ...


class VitalsTimeseriesResponse(DataResponse[list[VitalPointDTO]]):
    ...


class NutritionSuggestionsResponse(DataResponse[list[NutritionSuggestionDTO]]):
    ...
class ExerciseSuggestionDTO(BaseModel):
    id: str
    type: str          # "tip" | "warning" | "goal" | "success"
    icon: str          # lucide icon name
    title: str         # i18n key
    message: str       # i18n key
    message_params: dict[str, int | float] | None = None
    priority: int
    duration_minutes: int | None = None
    intensity: str     # "low" | "medium" | "high"
    category: str      # "cardio" | "strength" | "flexibility" | "balance"


class ExerciseSuggestionsResponse(DataResponse[list[ExerciseSuggestionDTO]]):
    ...
