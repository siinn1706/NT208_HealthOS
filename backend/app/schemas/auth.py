from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr

from app.schemas.common import DataResponse


class OAuthProfile(BaseModel):
    """Profile payload forwarded from BFF after OAuth login."""

    provider: str
    provider_account_id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


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

