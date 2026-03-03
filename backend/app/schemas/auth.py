from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import DataResponse


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


class VerifyOtpBody(BaseModel):
    """Verify submitted OTP code."""

    email: EmailStr
    purpose: Literal["signup", "reset_password", "login"] = "signup"
    code: str = Field(min_length=4, max_length=12)


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
    new_password: str = Field(min_length=8)


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: EmailStr
    display_name: str
    avatar_url: Optional[str] = None


class AuthTokenResponse(DataResponse[AuthToken]):
    ...


class CurrentUser(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    avatar_url: Optional[str] = None


class CurrentUserResponse(DataResponse[CurrentUser]):
    ...

