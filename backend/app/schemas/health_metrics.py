from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.common import PaginatedResponse


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
