from __future__ import annotations

import datetime
import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DataResponse


class HealthGoalBase(BaseModel):
    # BMI is always derived: bmi = target_weight_kg / (profile_height_cm/100)²
    # Height comes from user_profiles — single source of truth
    target_weight_kg: float | None = Field(None, ge=30.0, le=200.0)
    deadline: date | None = None

    @model_validator(mode="after")
    def require_at_least_one_target(self) -> "HealthGoalBase":
        if self.target_weight_kg is None:
            raise ValueError("target_weight_kg must be set")
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline must be today or in the future")
        return self


class HealthGoalCreate(HealthGoalBase): ...


class HealthGoalUpdate(BaseModel):
    target_weight_kg: float | None = Field(None, ge=30.0, le=200.0)
    deadline: date | None = None

    @model_validator(mode="after")
    def require_at_least_one_target(self) -> "HealthGoalUpdate":
        has_any = self.target_weight_kg is not None or self.deadline is not None
        if not has_any:
            return self
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline must be today or in the future")
        return self


class HealthGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    # target_bmi is NOT stored — always computed from target_weight_kg / (profile_height_cm/100)²
    target_weight_kg: float | None = None
    deadline: date | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class HealthGoalDataResponse(DataResponse[HealthGoalResponse]): ...
