from __future__ import annotations

from typing import Any

from app.schemas.common import DataResponse


class RiskPredictionResponse(DataResponse[dict[str, Any]]):
    ...


class HealthReportResponse(DataResponse[dict[str, Any]]):
    ...


class TrendAnalysisResponse(DataResponse[dict[str, Any]]):
    ...


class TrendAnalysisBatchResponse(DataResponse[dict[str, dict[str, Any]]]):
    ...

