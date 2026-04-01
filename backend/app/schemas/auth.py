from __future__ import annotations

import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import DataResponse
from app.services.password_validator import validate_password


class OAuthProfile(BaseModel):
    """Profile payload forwarded from BFF after OAuth login."""

    provider: str
    provider_account_id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class RequestOtpBody(BaseModel):
    """Request body for email OTP."""

    email: EmailStr
    purpose: Literal["signup", "reset_password", "login"] = "signup"
    name: Optional[str] = None
    username: Optional[str] = Field(None, description="Username for signup")
    password: Optional[str] = Field(None, description="Password for signup")

    @field_validator('password', mode='before')
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            is_valid, errors = validate_password(v)
            if not is_valid:
                raise ValueError('; '.join(errors))
        return v


class VerifyOtpBody(BaseModel):
    """Verify submitted OTP code."""

    email: EmailStr
    purpose: Literal["signup", "reset_password", "login"] = "signup"
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r'^\d{6}$',
        description="6-digit OTP code",
        json_schema_extra={"example": "482193"}
    )

    password: str | None = Field(default=None, description="Password when Signing up")

    @field_validator('password', mode='before')
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            is_valid, errors = validate_password(v)
            if not is_valid:
                raise ValueError('; '.join(errors))
        return v

    @field_validator('purpose', mode='before')
    @classmethod
    def sync_purpose_format(cls, value: str) -> str:
        return value.lower()


class OtpRequested(BaseModel):
    delivery: Literal["email"] = "email"
    expires_in_seconds: int = 300
    # For dev only: return OTP to help local testing
    otp: Optional[str] = None


class OtpRequestedResponse(DataResponse[OtpRequested]):
    ...


class OtpVerified(BaseModel):
    """Returned after a successful OTP verification for reset_password.

    The caller must follow up with POST /auth/reset-password within the TTL.
    """

    email: EmailStr
    next_step: Literal["reset_password"] = "reset_password"


class OtpVerifiedResponse(DataResponse[OtpVerified]):
    ...


class ResetPasswordBody(BaseModel):
    """Request body to complete password reset after OTP is verified."""

    email: EmailStr
    new_password: str = Field(description="New password")

    @field_validator('new_password', mode='before')
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            is_valid, errors = validate_password(v)
            if not is_valid:
                raise ValueError('; '.join(errors))
        return v


class LoginBody(BaseModel):
    """Request body for identifier (email or username) + password login."""

    identifier: str = Field(min_length=1, description="Email or username")
    password: str = Field(min_length=1)


class CheckUsernameResponse(BaseModel):
    """Response for username availability check."""

    available: bool


class CheckEmailResponse(BaseModel):
    """Response for email availability check."""

    available: bool


class EmergencyContact(BaseModel):
    """Emergency contact information."""

    name: str
    email: Optional[EmailStr] = None
    phone: str
    relationship: str


class MedicalInfo(BaseModel):
    """Medical information."""

    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    notes: Optional[str] = None


class UserProfileUpdate(BaseModel):
    """Request body for updating user profile."""

    full_name: Optional[str] = None
    date_of_birth: Optional[datetime.date] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    accent_color: Optional[str] = None
    emergency_contacts: Optional[list[EmergencyContact]] = None
    medical_info: Optional[MedicalInfo] = None
    onboarding_completed: Optional[bool] = False

    @field_validator("accent_color", mode="before")
    @classmethod
    def normalize_accent_color(cls, v: Any) -> Any:
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError("accent_color must be a hex color string like #rrggbb or null")
        val = v.strip()
        if not val:
            return None
        if not val.startswith("#") or len(val) != 7:
            raise ValueError("accent_color must match #rrggbb")
        hex_part = val[1:]
        if any(c not in "0123456789abcdefABCDEF" for c in hex_part):
            raise ValueError("accent_color must match #rrggbb")
        return f"#{hex_part.lower()}"

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        """Normalize gender to lowercase and blood_type to uppercase."""
        if isinstance(data, dict):
            if "gender" in data and data["gender"]:
                data["gender"] = data["gender"].lower()
            if "blood_type" in data and data["blood_type"]:
                data["blood_type"] = data["blood_type"].upper()
        return data


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: EmailStr
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    onboarding_status: str = "pending"


class AuthTokenResponse(DataResponse[AuthToken]):
    ...


class WsTicket(BaseModel):
    ws_ticket: str
    expires_in_seconds: int


class WsTicketResponse(DataResponse[WsTicket]):
    ...


class CurrentUser(BaseModel):
    id: str
    email: EmailStr
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    onboarding_status: str = "pending"
    onboarding_completed_at: Optional[str] = None
    created_at: Optional[str] = None

    # Optional profile fields (used by /v1/users/me)
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    blood_type: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    accent_color: Optional[str] = None
    emergency_contacts: Optional[list[dict[str, Any]]] = None
    medical_info: Optional[dict[str, Any]] = None


class CurrentUserResponse(DataResponse[CurrentUser]):
    ...

