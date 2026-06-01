from __future__ import annotations

import datetime
import re
import uuid
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.schemas.common import DataResponse
from app.services.password_validator import validate_password


class OAuthProfile(BaseModel):
    """Profile payload forwarded from BFF after OAuth login."""

    provider: str
    provider_account_id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None
    exchange_issuer: Optional[str] = Field(default=None, max_length=64)
    exchange_audience: Optional[str] = Field(default=None, max_length=64)
    exchange_expires_at: Optional[str] = Field(default=None, max_length=64)
    exchange_nonce: Optional[str] = Field(
        default=None,
        min_length=16,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    )
    exchange_signature: Optional[str] = Field(
        default=None,
        min_length=64,
        max_length=128,
        pattern=r"^[A-Fa-f0-9]+$",
    )


class MobileOAuthHandoff(BaseModel):
    code: str
    expires_in_seconds: int


class MobileOAuthHandoffResponse(DataResponse[MobileOAuthHandoff]):
    ...


class MobileOAuthHandoffBody(OAuthProfile):
    mobile_state: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]+$",
    )
    mobile_code_challenge: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]+$",
    )


class MobileOAuthRedeemBody(BaseModel):
    code: str = Field(
        min_length=32,
        max_length=256,
        pattern=r"^[A-Za-z0-9._~:-]+$",
    )
    state: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]+$",
    )
    code_verifier: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]+$",
    )


# ─── OAuth Linked Accounts (settings → linked accounts) ─────────────────────


class OAuthLinkAttachBody(BaseModel):
    """BFF posts this when an authenticated user re-authorizes a new provider."""

    user_id: uuid.UUID
    profile: OAuthProfile


class OAuthLinkDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider: str
    provider_account_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    linked_at: Optional[datetime.datetime] = None
    last_used_at: Optional[datetime.datetime] = None


class OAuthLinkListResponse(DataResponse[list[OAuthLinkDTO]]):
    ...


class OAuthLinkResponse(DataResponse[OAuthLinkDTO]):
    ...


class RequestOtpBody(BaseModel):
    """Request body for email OTP."""

    email: EmailStr
    # OAuth-only users prove identity for account deletion without a password.
    purpose: Literal["signup", "reset_password", "login", "delete_account"] = "signup"
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
    purpose: Literal["signup", "reset_password", "login", "delete_account"] = "signup"
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
    """Returned after a successful OTP verification that needs a follow-up step.

    The caller must follow up with the matching endpoint within the TTL.
    """

    email: EmailStr
    next_step: Literal["reset_password", "delete_account"] = "reset_password"


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


class MfaLoginRequired(BaseModel):
    mfa_required: Literal[True] = True
    challenge_id: str
    expires_in_seconds: int


class MfaLoginVerifyBody(BaseModel):
    challenge_id: str = Field(min_length=1)
    code: str = Field(min_length=6, max_length=64)


class RefreshTokenBody(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutBody(BaseModel):
    refresh_token: str | None = None


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


class InsuranceInfo(BaseModel):
    """Insurance details stored inside user profile medical_info."""

    provider: str = Field(min_length=1, max_length=128)
    policy_number: str = Field(min_length=1, max_length=128)
    group_number: Optional[str] = Field(None, max_length=128)


class MedicalInfo(BaseModel):
    """Medical information."""

    allergies: Optional[str] = Field(None, max_length=2000)
    chronic_conditions: Optional[str] = Field(None, max_length=2000)
    current_medications: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=4000)
    insurance: Optional[InsuranceInfo] = None


class UserProfileUpdate(BaseModel):
    """Request body for updating user profile."""

    full_name: str = Field(None, min_length=1, max_length=255)
    date_of_birth: Optional[datetime.date] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    blood_type: Optional[str] = Field(None, max_length=16)
    height_cm: Optional[float] = Field(None, ge=50, le=300)
    weight_kg: Optional[float] = Field(None, ge=1, le=500)
    phone: Optional[str] = Field(None, max_length=32)
    address: Optional[str] = Field(None, max_length=512)
    avatar_url: Optional[str] = Field(None, max_length=512)
    emergency_contacts: Optional[list[EmergencyContact]] = None
    medical_info: Optional[MedicalInfo] = None
    # None = no-op (field absent); False = explicitly mark incomplete; True = mark complete
    onboarding_completed: Optional[bool] = None

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v: object) -> object:
        if v is None:
            raise ValueError("full_name cannot be null")
        if not isinstance(v, str):
            raise ValueError("full_name must be a string")
        s = v.strip()
        if not s:
            raise ValueError("full_name cannot be empty")
        return s

    @field_validator("avatar_url", mode="before")
    @classmethod
    def validate_avatar_url(cls, v: object) -> object:
        if v is None or v == "":
            return None
        if not isinstance(v, str):
            raise ValueError("avatar_url must be a string")
        s = v.strip()
        if len(s) > 512:
            raise ValueError("avatar_url exceeds maximum length")
        lower = s.lower()
        if not (lower.startswith("http://") or lower.startswith("https://")):
            raise ValueError("avatar_url must be an http(s) URL")
        return s

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v: object) -> object:
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("phone must be a string")
        if not re.match(r"^\+?[0-9][0-9\-\s()]{4,18}[0-9]$", v):
            raise ValueError("Invalid phone number format")
        return v

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
    refresh_token: str | None = None
    user_id: str
    email: str
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    onboarding_status: str = "pending"
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class AuthTokenResponse(DataResponse[AuthToken]):
    ...


class AuthLoginResponse(DataResponse[AuthToken | MfaLoginRequired]):
    ...


class WsTicket(BaseModel):
    ws_ticket: str
    expires_in_seconds: int


class WsTicketResponse(DataResponse[WsTicket]):
    ...


class CurrentUser(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    onboarding_status: str = "pending"
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
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
    emergency_contacts: Optional[list[dict[str, Any]]] = None
    medical_info: Optional[MedicalInfo] = None


class CurrentUserResponse(DataResponse[CurrentUser]):
    ...

