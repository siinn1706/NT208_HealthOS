from __future__ import annotations

from typing import Literal

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


AiAdviceStatus = Literal["ready", "fallback"]
AiAdviceCategory = Literal[
    "nutrition",
    "activity",
    "sleep",
    "vitals",
    "medication",
    "general",
]
AiAdvicePriority = Literal["low", "medium", "high"]
AiAdviceSource = Literal["ai", "rule", "cache"]
AiAdviceActionType = Literal[
    "log_meal",
    "walk",
    "sleep_hygiene",
    "view_trends",
    "open_chat",
    "track_vitals",
]


class DashboardAiAdviceActionDTO(BaseModel):
    id: str
    label: str
    route: str | None = None
    type: AiAdviceActionType


class DashboardAiAdviceEvidenceDTO(BaseModel):
    metric: str
    value: float | str | None = None
    unit: str | None = None
    comparison: str | None = None


class DashboardAiAdviceRagSourceDTO(BaseModel):
    title: str
    organization: str
    url: str


class DashboardAiAdviceDTO(BaseModel):
    id: str
    status: AiAdviceStatus
    category: AiAdviceCategory
    priority: AiAdvicePriority
    title: str
    body: str
    actions: list[DashboardAiAdviceActionDTO]
    evidence: list[DashboardAiAdviceEvidenceDTO]
    source: AiAdviceSource
    rag_sources: list[DashboardAiAdviceRagSourceDTO] = []
    generated_at: str
    expires_at: str
    disclaimer: str


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


class DashboardAiAdviceResponse(DataResponse[DashboardAiAdviceDTO]):
    ...


class VitalsTimeseriesResponse(DataResponse[list[VitalPointDTO]]):
    ...


class NutritionSuggestionsResponse(DataResponse[list[NutritionSuggestionDTO]]):
    ...
class ExerciseSuggestionDTO(BaseModel):
    id: str
    type: str          # "tip" | "warning" | "goal" | "success"
    icon: str          # lucide icon name
    title: str         # i18n key OR plain text (when source="ai")
    message: str       # i18n key OR plain text (when source="ai")
    message_params: dict[str, int | float | str] | None = None
    priority: int
    duration_minutes: int | None = None
    intensity: str     # "low" | "medium" | "high"
    category: str      # "cardio" | "strength" | "flexibility" | "balance"
    source: str = "rule"  # "rule" | "ai"


class ExerciseSuggestionsResponse(DataResponse[list[ExerciseSuggestionDTO]]):
    ...
