"""Auth endpoints — OAuth session exchange, email OTP, and current user."""
import asyncio
import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.adapters.database import get_db
from app.adapters.email_client import send_otp_email
from app.adapters.redis_client import get_redis
from app.core.security import create_ws_ticket, get_current_user
from app.core.config import settings
from app.models.core import User
from app.schemas.auth import (
    AuthToken,
    AuthTokenResponse,
    CurrentUser,
    CurrentUserResponse,
    LoginBody,
    OAuthProfile,
    OtpRequested,
    OtpRequestedResponse,
    OtpVerified,
    OtpVerifiedResponse,
    RequestOtpBody,
    ResetPasswordBody,
    VerifyOtpBody,
    WsTicket,
    WsTicketResponse,
)
from app.schemas.common import ErrorDetail, ErrorResponse
from app.services.otp import (
    OTP_MAX_ATTEMPTS,
    OTP_TTL_SECONDS,
    cleanup_expired_otps,
    create_otp_audit_record,
    decrement_attempts,
    get_latest_active_otp,
    mark_otp_consumed,
    otp_expiry_time,
)
from app.services.auth import create_user_access_token, get_or_create_user_from_oauth
from sqlalchemy import select

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

WS_TICKET_EXPIRES_SECONDS = 120


@router.get(
    "/ws-ticket",
    response_model=WsTicketResponse,
    responses={401: {"model": ErrorResponse}},
)
async def issue_ws_ticket(
    current_user: User = Depends(get_current_user),
) -> WsTicketResponse:
    ticket = create_ws_ticket(str(current_user.id), expires_seconds=WS_TICKET_EXPIRES_SECONDS)
    return WsTicketResponse(
        data=WsTicket(
            ws_ticket=ticket,
            expires_in_seconds=WS_TICKET_EXPIRES_SECONDS,
        )
    )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def login_with_password(
    body: LoginBody,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """
    Authenticate with email + password and return a JWT access token.

    The password must have been set via the reset-password flow.
    Returns 401 if the password is wrong, 404 if the account doesn't exist.
    """
    from app.core.security import verify_password

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                code="EMAIL_NOT_FOUND",
                message="No account found with that email address.",
                details={},
            ).model_dump(),
        )

    if not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorDetail(
                code="AUTH_INVALID_CREDENTIALS",
                message="Invalid email or password.",
                details={},
            ).model_dump(),
        )

    access_token = create_user_access_token(user)
    token = AuthToken(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
    )
    return AuthTokenResponse(data=token)


@router.post(
    "/token",
    response_model=AuthTokenResponse,
    responses={401: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def exchange_oauth_profile_for_token(
    body: OAuthProfile,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """
    Exchange an OAuth profile (from BFF) for a Core BE JWT.

    Flow:
      1. BFF calls this endpoint after OAuth login succeeds.
      2. Core BE finds or creates a User.
      3. Core BE returns a JWT access token bound to the user.id.
    """
    user = await get_or_create_user_from_oauth(body, db)
    access_token = create_user_access_token(user)

    token = AuthToken(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
    )
    return AuthTokenResponse(data=token)


@router.post(
    "/request-otp",
    response_model=OtpRequestedResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def request_email_otp(
    body: RequestOtpBody,
    redis: Redis = Depends(get_redis),
) -> OtpRequestedResponse:
    """
    Request a one-time password (OTP) to be sent via email.

    - For **reset_password** purpose: the email must belong to an existing account;
      returns 404 EMAIL_NOT_FOUND otherwise so the caller can redirect to signup.
      DB is opened lazily so signup requests never need a DB connection.
    - Stores OTP in Redis with a 5-minute TTL.
    - Sends OTP to the given email address via SMTP.
    """
    # For password-reset, the account must already exist.
    # Open DB only for this branch so signup never requires a DB connection.
    if body.purpose == "reset_password":
        from app.adapters.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.email == body.email)
            )
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=ErrorDetail(
                        code="EMAIL_NOT_FOUND",
                        message="No account found with that email address.",
                        details={},
                    ).model_dump(),
                )

    code = f"{random.randint(0, 999999):06d}"
    otp_key = f"auth:otp:{body.purpose}:{body.email}"
    cooldown_key = f"auth:otp:cooldown:{body.purpose}:{body.email}"

    # Basic rate limit: 1 OTP per 60 seconds per email+purpose.
    if await redis.exists(cooldown_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=ErrorDetail(
                code="RATE_LIMITED",
                message="Please wait before requesting another OTP.",
                details={},
            ).model_dump(),
        )

    expires_in_seconds = OTP_TTL_SECONDS

    # OTP TTL: 5 minutes (300 s).  Cooldown: 60 s.
    await redis.setex(otp_key, expires_in_seconds, code)
    await redis.setex(cooldown_key, 60, "1")

    try:
        await asyncio.to_thread(send_otp_email, body.email, code, body.purpose)
    except Exception as exc:  # pragma: no cover - external I/O
        # Best-effort cleanup: remove the stored OTP so user can retry
        await redis.delete(otp_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                code="UPSTREAM_ERROR",
                message="Failed to send OTP email.",
                details={"reason": str(exc)},
            ).model_dump(),
        ) from exc

    # Best-effort DB audit (hybrid mode): Redis remains source of truth for OTP check.
    # If DB write fails, OTP flow still works via Redis.
    try:
        from app.adapters.database import AsyncSessionLocal

        async with AsyncSessionLocal() as audit_db:
            await cleanup_expired_otps(audit_db, body.email, body.purpose)
            await create_otp_audit_record(
                audit_db,
                email=body.email,
                purpose=body.purpose,
                raw_code=code,
                expires_at=otp_expiry_time(expires_in_seconds),
            )
            await audit_db.commit()
    except Exception:
        logger.exception("Failed to persist OTP audit record", extra={"email": body.email, "purpose": body.purpose})

    return OtpRequestedResponse(
        data=OtpRequested(
            delivery="email",
            expires_in_seconds=expires_in_seconds,
            otp=code if settings.debug else None,
        )
    )


@router.post(
    "/verify-otp",
    responses={
        200: {"model": AuthTokenResponse},
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def verify_email_otp(
    body: VerifyOtpBody,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an email OTP code.

    - **signup**: creates (or retrieves) the user and returns a JWT access token.
    - **reset_password**: verifies the code, stores a short-lived "verified" marker
      in Redis, and returns ``{ data: { email, next_step: "reset_password" } }``.
      The caller must then call POST /auth/reset-password within 5 minutes.
    """
    key = f"auth:otp:{body.purpose}:{body.email}"
    otp_record = await get_latest_active_otp(db, body.email, body.purpose)
    if otp_record is not None and otp_record.attempts_left <= 0:
        await redis.delete(key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                code="AUTH_OTP_LOCKED",
                message="Too many invalid OTP attempts. Please request a new code.",
                details={},
            ).model_dump(),
        )

    stored_code = await redis.get(key)
    if stored_code is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                code="AUTH_INVALID_OTP",
                message="Invalid or expired OTP code.",
                details={},
            ).model_dump(),
        )

    if stored_code != body.code:
        remaining_attempts = None
        if otp_record is not None:
            remaining_attempts = await decrement_attempts(db, otp_record)
            await db.commit()
            if remaining_attempts <= 0:
                await redis.delete(key)

        details = {}
        if remaining_attempts is not None:
            details = {
                "attempts_left": remaining_attempts,
                "max_attempts": OTP_MAX_ATTEMPTS,
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                code="AUTH_INVALID_OTP",
                message="Invalid OTP code.",
                details=details,
            ).model_dump(),
        )

    # OTP is one-time use
    await redis.delete(key)
    if otp_record is not None:
        await mark_otp_consumed(db, otp_record)

    # ── reset_password: verify only — do NOT create a new user ──────────────
    if body.purpose == "reset_password":
        result = await db.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorDetail(
                    code="EMAIL_NOT_FOUND",
                    message="No account found with that email address.",
                    details={},
                ).model_dump(),
            )
        # Store a "verified" marker so reset-password can proceed (TTL 5 min)
        verified_key = f"auth:otp:reset_verified:{body.email}"
        await redis.setex(verified_key, OTP_TTL_SECONDS, "1")
        return OtpVerifiedResponse(
            data=OtpVerified(email=body.email, next_step="reset_password")
        )

    # ── login: verify OTP for existing user, return JWT ─────────────────────
    if body.purpose == "login":
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorDetail(
                    code="EMAIL_NOT_FOUND",
                    message="No account found with that email address.",
                    details={},
                ).model_dump(),
            )
        access_token = create_user_access_token(user)
        token = AuthToken(
            access_token=access_token,
            user_id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.profile.avatar_url if user.profile is not None else None,
        )
        return AuthTokenResponse(data=token)

    # ── signup: create / fetch user and issue JWT ────────────────────────────
    synthetic_profile = OAuthProfile(
        provider="otp",
        provider_account_id=body.email,
        email=body.email,
        name=body.email,
        avatar_url=None,
    )
    try:
        user = await get_or_create_user_from_oauth(synthetic_profile, db)
    except IntegrityError:
        # Race condition: two simultaneous signups for the same email.
        # Rollback and fetch the now-existing user.
        await db.rollback()
        from sqlalchemy import select as _select
        result = await db.execute(_select(User).where(User.email == body.email))
        user = result.scalar_one()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred while creating your account.",
                details={},
            ).model_dump(),
        ) from exc
    access_token = create_user_access_token(user)

    token = AuthToken(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
    )
    return AuthTokenResponse(data=token)


@router.post(
    "/reset-password",
    response_model=AuthTokenResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def reset_password(
    body: ResetPasswordBody,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """
    Complete a password-reset flow.

    Requires a prior successful call to POST /auth/verify-otp with
    purpose=\'reset_password\' (which stores a short-lived verified marker).
    Updates the user\'s hashed password and returns a JWT access token.
    """
    verified_key = f"auth:otp:reset_verified:{body.email}"
    if not await redis.exists(verified_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                code="RESET_NOT_VERIFIED",
                message="OTP verification required before resetting password.",
                details={},
            ).model_dump(),
        )

    from app.core.security import hash_password

    result = await db.execute(
        select(User).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                code="EMAIL_NOT_FOUND",
                message="No account found with that email address.",
                details={},
            ).model_dump(),
        )

    user.hashed_password = hash_password(body.new_password)
    await redis.delete(verified_key)

    access_token = create_user_access_token(user)
    token = AuthToken(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
    )
    return AuthTokenResponse(data=token)


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    responses={401: {"model": ErrorResponse}},
)
async def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Return the currently authenticated user."""
    return CurrentUserResponse(
        data=CurrentUser(
            id=str(current_user.id),
            email=current_user.email,
            display_name=current_user.display_name,
            avatar_url=current_user.profile.avatar_url
            if current_user.profile is not None
            else None,
        )
    )

