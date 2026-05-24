from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DataResponse

BillingPeriod = Literal["free", "monthly", "yearly"]
SubscriptionStatus = Literal["active", "trialing", "past_due", "canceled", "expired"]


class SubscriptionPlanDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name_vi: str
    name_en: str | None = None
    description_vi: str | None = None
    description_en: str | None = None
    price_vnd: int
    billing_period: BillingPeriod
    features_vi: list[str]
    features_en: list[str] | None = None
    limits: dict[str, Any]
    is_active: bool
    is_recommended: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SubscriptionPlanCreateBody(BaseModel):
    code: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name_vi: str = Field(min_length=1, max_length=255)
    name_en: str | None = Field(default=None, max_length=255)
    description_vi: str | None = None
    description_en: str | None = None
    price_vnd: int = Field(default=0, ge=0)
    billing_period: BillingPeriod
    features_vi: list[str] = Field(default_factory=list)
    features_en: list[str] | None = None
    limits: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    is_recommended: bool = False
    sort_order: int = 0


class SubscriptionPlanUpdateBody(BaseModel):
    name_vi: str | None = Field(default=None, min_length=1, max_length=255)
    name_en: str | None = Field(default=None, max_length=255)
    description_vi: str | None = None
    description_en: str | None = None
    price_vnd: int | None = Field(default=None, ge=0)
    billing_period: BillingPeriod | None = None
    features_vi: list[str] | None = None
    features_en: list[str] | None = None
    limits: dict[str, Any] | None = None
    is_active: bool | None = None
    is_recommended: bool | None = None
    sort_order: int | None = None


class UserSubscriptionUpdateBody(BaseModel):
    plan_id: uuid.UUID | None = None
    plan_code: str | None = Field(default=None, min_length=1, max_length=64)
    status: SubscriptionStatus | None = None
    expires_at: datetime | None = None
    admin_note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "UserSubscriptionUpdateBody":
        if not self.model_fields_set:
            raise ValueError("At least one subscription field is required.")
        return self


class UserSubscriptionSummary(BaseModel):
    subscription_id: uuid.UUID | None = None
    status: str
    started_at: datetime | None = None
    expires_at: datetime | None = None
    plan: SubscriptionPlanDTO
    limits: dict[str, Any]
    features_vi: list[str]
    features_en: list[str] | None = None


class SubscriptionPlanListResponse(DataResponse[list[SubscriptionPlanDTO]]):
    pass


class SubscriptionPlanResponse(DataResponse[SubscriptionPlanDTO]):
    pass


class UserSubscriptionResponse(DataResponse[UserSubscriptionSummary]):
    pass
