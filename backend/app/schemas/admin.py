from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import DataResponse, PaginatedResponse


class AdminOverview(BaseModel):
    total_users: int
    active_users: int
    banned_users: int
    soft_deleted_users: int
    online_users_estimate: int
    total_subscription_plans: int
    total_active_subscriptions: int
    created_at: datetime


class AdminCurrentSubscriptionSummary(BaseModel):
    id: uuid.UUID | None = None
    plan_code: str
    plan_name: str
    status: str
    current_period_end: datetime | None = None


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    display_name: str
    onboarding_status: str
    email_verified_at: datetime | None = None
    created_at: datetime
    deleted_at: datetime | None = None
    banned_at: datetime | None = None
    banned_reason: str | None = None
    roles: list[str]
    current_subscription: AdminCurrentSubscriptionSummary | None = None
    last_seen_at: datetime | None = None


class AdminProfileSummary(BaseModel):
    full_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    phone: str | None = None
    address: str | None = None
    avatar_url: str | None = None


class AdminLoginSessionSummary(BaseModel):
    refresh_session_count: int
    active_refresh_sessions: int
    revoked_refresh_sessions: int
    last_refresh_used_at: datetime | None = None
    tokens_invalidated_at: datetime | None = None


class AdminUserDetail(AdminUserListItem):
    profile_summary: AdminProfileSummary | None = None
    subscription: AdminCurrentSubscriptionSummary | None = None
    login_session_summary: AdminLoginSessionSummary
    account_status: Literal["active", "banned", "deleted", "system"]
    is_system: bool
    banned_by_id: uuid.UUID | None = None
    banned_until: datetime | None = None


class AdminBanUserBody(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    banned_until: datetime | None = None


class AdminOverviewResponse(DataResponse[AdminOverview]):
    pass


class AdminUserListResponse(PaginatedResponse[AdminUserListItem]):
    pass


class AdminUserDetailResponse(DataResponse[AdminUserDetail]):
    pass
