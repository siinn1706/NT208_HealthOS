from __future__ import annotations

import datetime
import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DataResponse


class HealthGoalBase(BaseModel):
    target_bmi: float | None = Field(None, ge=15.0, le=35.0)
    target_weight_kg: float | None = Field(None, ge=30.0, le=200.0)
    current_height_cm: float | None = Field(None, ge=100.0, le=220.0)
    deadline: date | None = None

    @model_validator(mode="after")
    def require_at_least_one_target(self) -> "HealthGoalBase":
        if self.target_bmi is None and self.target_weight_kg is None:
            raise ValueError(
                "At least one of target_bmi or target_weight_kg must be set"
            )
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline must be today or in the future")
        return self


class HealthGoalCreate(HealthGoalBase): ...


class HealthGoalUpdate(BaseModel):
    target_bmi: float | None = Field(None, ge=15.0, le=35.0)
    target_weight_kg: float | None = Field(None, ge=30.0, le=200.0)
    current_height_cm: float | None = Field(None, ge=100.0, le=220.0)
    deadline: date | None = None

    @model_validator(mode="after")
    def require_at_least_one_target(self) -> "HealthGoalUpdate":
        has_any = (
            self.target_bmi is not None
            or self.target_weight_kg is not None
            or self.current_height_cm is not None
            or self.deadline is not None
        )
        if not has_any:
            return self
        if self.target_bmi is None and self.target_weight_kg is None:
            raise ValueError(
                "At least one of target_bmi or target_weight_kg must be set when updating"
            )
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline must be today or in the future")
        return self


class HealthGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    target_bmi: float | None = None
    target_weight_kg: float | None = None
    current_height_cm: float | None = None
    deadline: date | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class HealthGoalDataResponse(DataResponse[HealthGoalResponse]): ...
