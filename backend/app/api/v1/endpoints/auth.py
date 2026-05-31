"""Auth endpoints — OAuth session exchange, email OTP, and current user."""
import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.adapters.database import get_db
from app.adapters.email_client import send_otp_email
from app.adapters.redis_client import get_redis
from app.core.security import create_ws_ticket, get_current_user, http_bearer, revoke_token
from app.core.rate_limit import rate_limit_login, rate_limit_otp_request, rate_limit_availability
from app.core.config import settings
from app.exceptions import (
    ApiException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from app.models.core import User
from app.schemas.auth import (
    AuthLoginResponse,
    AuthToken,
    AuthTokenResponse,
    CheckEmailResponse,
    CheckUsernameResponse,
    CurrentUser,
    CurrentUserResponse,
    LoginBody,
    LogoutBody,
    MfaLoginRequired,
    MfaLoginVerifyBody,
    OAuthLinkAttachBody,
    OAuthLinkDTO,
    OAuthLinkListResponse,
    OAuthLinkResponse,
    OAuthProfile,
    OtpRequested,
    OtpRequestedResponse,
    OtpVerified,
    OtpVerifiedResponse,
    RequestOtpBody,
    RefreshTokenBody,
    ResetPasswordBody,
    VerifyOtpBody,
    WsTicket,
    WsTicketResponse,
)
from app.schemas.common import ErrorResponse
from app.services.otp import (
    OTP_MAX_ATTEMPTS,
    OTP_TTL_SECONDS,
    cleanup_expired_otps,
    create_otp_audit_record,
    decrement_attempts,
    get_latest_active_otp,
    mark_otp_consumed,
    otp_expiry_time,
    redis_getdel_compat,
)
from app.services.auth import (
    UserBanned,
    UserPendingDeletion,
    check_email_availability,
    check_username_availability,
    create_user_access_token,
    get_or_create_user_from_oauth,
    get_user_by_identifier,
    validate_username,
)
from app.services.mfa import totp_service
from app.services.refresh_tokens import (
    RefreshTokenError,
    RefreshTokenReuseError,
    RefreshTokenUserBannedError,
    issue_refresh_token,
    revoke_refresh_token,
    revoke_refresh_tokens_for_user,
    rotate_refresh_token,
)
from app.services.account_status import is_active_ban
from app.services.security_logging import log_security_event
from app.services.audit import audit
from app.services import rbac as rbac_service
from app.services import oauth_links as oauth_link_svc
from app.services.oauth_links import LastSignInMethodError, OAuthLinkConflict
from app.models.audit import AuditEventTypeEnum
from app.services.hibp import check_password_breach
from app.core.event_logging import hash_email, log_event

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

WS_TICKET_EXPIRES_SECONDS = 120
MFA_LOGIN_CHALLENGE_TTL_SECONDS = 5 * 60
MFA_LOGIN_MAX_ATTEMPTS = 5
BFF_EXCHANGE_NONCE_PREFIX = "auth:bff_exchange_nonce:"
BFF_EXCHANGE_REQUIRED_ENVS = {"production", "staging"}


def _can_use_debug_otp_delivery_fallback() -> bool:
    return settings.debug and settings.resolved_runtime_env() not in {"production", "staging"}


def _smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _should_skip_otp_email_delivery_for_dev() -> bool:
    return _can_use_debug_otp_delivery_fallback() and not _smtp_configured()


def _mfa_login_challenge_key(challenge_id: str) -> str:
    return f"auth:mfa:login:{challenge_id}"


async def _rbac_snapshot(db: AsyncSession, user_id: uuid.UUID) -> tuple[list[str], list[str]]:
    roles = list(await rbac_service.list_user_roles(db, user_id))
    permissions = sorted(await rbac_service.list_user_permissions(db, user_id))
    return roles, permissions


def _raise_if_account_banned(user: User) -> None:
    if not is_active_ban(user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "ACCOUNT_BANNED",
            "message": "Your account has been banned.",
            "details": {
                "user_id": str(user.id),
                "banned_until": user.banned_until.isoformat() if user.banned_until else None,
            },
        },
    )


async def _issue_auth_token(
    *,
    db: AsyncSession,
    user: User,
    request: Request | None,
) -> AuthToken:
    _raise_if_account_banned(user)
    access_token = create_user_access_token(user)
    refresh_token = await issue_refresh_token(
        db,
        user_id=user.id,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    roles, permissions = await _rbac_snapshot(db, user.id)
    return AuthToken(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
        onboarding_status=user.onboarding_status,
        roles=roles,
        permissions=permissions,
    )


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
    response_model=AuthLoginResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
)
async def login_with_password(
    body: LoginBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    _rate: None = Depends(rate_limit_login),
) -> AuthLoginResponse:
    """
    Authenticate with email or username + password and return a JWT access token.

    The identifier can be an email address or username.
    Returns 401 INVALID_CREDENTIALS for both wrong password and unknown identifier
    to prevent user enumeration. Implements account lockout after 5 failed attempts.
    """
    from app.core.security import verify_password
    from app.services.auth import (
        check_account_lockout,
        record_failed_login,
        reset_failed_login_attempts,
    )

    user = await get_user_by_identifier(db, body.identifier)
    if user is None:
        from app.core.security import verify_password as _vp, DUMMY_HASH as _DH
        _vp(body.password, _DH)
        log_event("auth", "login_password", "invalid_credentials",
                  email_hash=hash_email(body.identifier), ip=request.client.host if request.client else None)
        raise UnauthorizedException(
            message="Tên đăng nhập hoặc mật khẩu không đúng",
            code="INVALID_CREDENTIALS",
        )

    # KNOWN LIMITATION: No cross-account per-IP failed login tracking.
    # Current mitigation: per-user lockout + per-IP rate limiting (10/min).
    # Future: Add Redis counter `failed_login:ip:{ip}` with threshold detection.

    # Check lockout BEFORE verifying password (prevents timing attacks)
    if await check_account_lockout(user):
        locked_minutes = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
        await log_security_event(
            db,
            AuditEventTypeEnum.ACCOUNT_LOCKED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"locked_minutes": locked_minutes},
        )
        log_event("auth", "login_password", "locked",
                  user_id=str(user.id), ip=request.client.host if request.client else None)
        raise UnauthorizedException(
            code="ACCOUNT_LOCKED",
            message=f"Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau {locked_minutes} phút.",
        )

    if not user.hashed_password or not verify_password(body.password, user.hashed_password):
        await record_failed_login(db, user)
        await log_security_event(
            db,
            AuditEventTypeEnum.LOGIN_FAILED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "invalid_password"},
        )
        log_event("auth", "login_password", "invalid_credentials",
                  user_id=str(user.id), ip=request.client.host if request.client else None)
        raise UnauthorizedException(
            message="Tên đăng nhập hoặc mật khẩu không đúng",
            code="INVALID_CREDENTIALS",
        )

    _raise_if_account_banned(user)

    # B7 review P0-3 — soft-deleted users get a typed 403 with the restore
    # link instead of a fresh JWT they can't use.
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_PENDING_DELETION",
                "message": "Your account is pending deletion. Restore it to continue.",
                "details": {
                    "user_id": str(user.id),
                    "purge_at": user.purge_at.isoformat() if user.purge_at else None,
                },
            },
        )

    if user.mfa_enabled:
        challenge_id = str(uuid.uuid4())
        challenge_payload = {
            "user_id": str(user.id),
            "attempts_left": MFA_LOGIN_MAX_ATTEMPTS,
        }
        await redis.setex(
            _mfa_login_challenge_key(challenge_id),
            MFA_LOGIN_CHALLENGE_TTL_SECONDS,
            json.dumps(challenge_payload),
        )
        log_event("auth", "login_password", "mfa_required", user_id=str(user.id))
        return AuthLoginResponse(
            data=MfaLoginRequired(
                challenge_id=challenge_id,
                expires_in_seconds=MFA_LOGIN_CHALLENGE_TTL_SECONDS,
            )
        )

    await reset_failed_login_attempts(db, user)
    await log_security_event(
        db,
        AuditEventTypeEnum.LOGIN_SUCCESS,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    log_event("auth", "login_password", "ok",
              user_id=str(user.id), ip=request.client.host if request.client else None)
    token = await _issue_auth_token(db=db, user=user, request=request)
    await db.commit()
    return AuthLoginResponse(data=token)


@router.post(
    "/login/mfa",
    response_model=AuthTokenResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
async def login_with_mfa(
    body: MfaLoginVerifyBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> AuthTokenResponse:
    from app.services.auth import record_failed_login, reset_failed_login_attempts

    challenge_key = _mfa_login_challenge_key(body.challenge_id)
    raw_payload = await redis.get(challenge_key)
    if not raw_payload:
        raise UnauthorizedException(
            code="MFA_CHALLENGE_INVALID",
            message="MFA challenge is invalid or expired.",
        )

    try:
        payload = json.loads(raw_payload)
        user_id = uuid.UUID(str(payload.get("user_id")))
        attempts_left = int(payload.get("attempts_left", 0))
    except (TypeError, ValueError, json.JSONDecodeError):
        await redis.delete(challenge_key)
        raise UnauthorizedException(
            code="MFA_CHALLENGE_INVALID",
            message="MFA challenge is invalid or expired.",
        )

    if attempts_left <= 0:
        await redis.delete(challenge_key)
        raise UnauthorizedException(
            code="MFA_CHALLENGE_LOCKED",
            message="MFA challenge was locked. Request a new login challenge.",
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id)
        .with_for_update()
    )
    user = result.scalar_one_or_none()
    if user is None or not user.mfa_enabled or not user.mfa_secret:
        await redis.delete(challenge_key)
        raise UnauthorizedException(
            code="MFA_NOT_ENABLED",
            message="MFA is not enabled for this account.",
        )
    if is_active_ban(user):
        await redis.delete(challenge_key)
        _raise_if_account_banned(user)

    method = None
    if user.mfa_recovery_codes:
        valid_recovery, remaining = totp_service.verify_recovery_code(body.code, user.mfa_recovery_codes)
        if valid_recovery:
            user.mfa_recovery_codes = remaining
            method = "recovery_code"

    if method is None and totp_service.verify(user.mfa_secret, body.code):
        method = "totp"

    if method is None:
        remaining_attempts = attempts_left - 1
        if remaining_attempts <= 0:
            await redis.delete(challenge_key)
        else:
            ttl = await redis.ttl(challenge_key)
            ttl_seconds = int(ttl) if isinstance(ttl, int) and ttl > 0 else MFA_LOGIN_CHALLENGE_TTL_SECONDS
            await redis.setex(
                challenge_key,
                ttl_seconds,
                json.dumps({"user_id": str(user.id), "attempts_left": remaining_attempts}),
            )
        await record_failed_login(db, user)
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_FAILED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "invalid_login_mfa_code"},
        )
        raise UnauthorizedException(
            code="INVALID_TOTP_CODE",
            message="Invalid verification code.",
        )

    await redis.delete(challenge_key)
    await reset_failed_login_attempts(db, user)
    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_VERIFIED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"method": method, "context": "login"},
    )
    await log_security_event(
        db,
        AuditEventTypeEnum.LOGIN_SUCCESS,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"mfa_method": method},
    )
    token = await _issue_auth_token(db=db, user=user, request=request)
    await db.commit()
    return AuthTokenResponse(data=token)


@router.get(
    "/check-username",
    response_model=CheckUsernameResponse,
    responses={400: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def check_username(
    username: str,
    db: AsyncSession = Depends(get_db),
    _rate: None = Depends(rate_limit_availability),
) -> CheckUsernameResponse:
    """
    Check if a username is available.

    Returns { available: true } if the username can be used,
    { available: false } if it's taken or invalid.
    """
    # First validate format
    is_valid, _ = validate_username(username)
    if not is_valid:
        return CheckUsernameResponse(available=False)

    # Check availability in database
    available = await check_username_availability(db, username)
    return CheckUsernameResponse(available=available)


@router.get(
    "/check-email",
    response_model=CheckEmailResponse,
    responses={400: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def check_email(
    email: str,
    db: AsyncSession = Depends(get_db),
    _rate: None = Depends(rate_limit_availability),
) -> CheckEmailResponse:
    """
    Check if an email is available.

    Returns { available: true } if the email can be used,
    { available: false } if it's taken or invalid.
    """
    normalized_email = email.lower().strip()
    if not normalized_email or "@" not in normalized_email:
        return CheckEmailResponse(available=False)

    available = await check_email_availability(db, normalized_email)
    return CheckEmailResponse(available=available)


def verify_bff_secret(request: Request) -> None:
    """Dependency: ensures /auth/token is only callable from the BFF via a shared secret."""
    expected = settings.bff_shared_secret
    if not expected:
        raise HTTPException(
            status_code=503,
            detail={"code": "CONFIG_ERROR", "message": "BFF secret not configured on server"},
        )
    actual = request.headers.get("X-BFF-Secret", "")
    if not hmac.compare_digest(actual, expected):
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Invalid BFF secret"},
        )


def _runtime_requires_bff_exchange_signature() -> bool:
    configured = getattr(settings, "bff_exchange_signing_required", None)
    if configured is not None:
        return bool(configured)
    resolved = getattr(settings, "resolved_runtime_env", None)
    runtime_env = resolved() if callable(resolved) else getattr(settings, "app_env", "development")
    return str(runtime_env).strip().lower() in BFF_EXCHANGE_REQUIRED_ENVS


def _canonical_bff_exchange_payload(body: OAuthProfile) -> bytes:
    payload = {
        "avatar_url": body.avatar_url,
        "email": str(body.email),
        "exchange_audience": body.exchange_audience,
        "exchange_expires_at": body.exchange_expires_at,
        "exchange_issuer": body.exchange_issuer,
        "exchange_nonce": body.exchange_nonce,
        "name": body.name,
        "provider": body.provider,
        "provider_account_id": body.provider_account_id,
    }
    return json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _parse_exchange_expiry(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


async def verify_bff_exchange_payload(body: OAuthProfile, redis: Redis) -> None:
    """Validate the signed BFF OAuth exchange envelope when required or present."""
    signature_fields = (
        body.exchange_issuer,
        body.exchange_audience,
        body.exchange_expires_at,
        body.exchange_nonce,
        body.exchange_signature,
    )
    if not _runtime_requires_bff_exchange_signature() and not any(signature_fields):
        return

    if not all(signature_fields):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "BFF_EXCHANGE_SIGNATURE_REQUIRED",
                "message": "Signed BFF exchange payload is required.",
            },
        )

    expected_issuer = getattr(settings, "bff_exchange_issuer", "healthos-bff")
    expected_audience = getattr(settings, "bff_exchange_audience", "healthos-core")
    if body.exchange_issuer != expected_issuer or body.exchange_audience != expected_audience:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "BFF_EXCHANGE_CLAIMS_INVALID",
                "message": "BFF exchange issuer or audience is invalid.",
            },
        )

    now = datetime.now(timezone.utc)
    expires_at = _parse_exchange_expiry(body.exchange_expires_at)
    max_age = int(getattr(settings, "bff_exchange_max_age_seconds", 300) or 300)
    if expires_at is None or expires_at <= now or expires_at > now + timedelta(seconds=max_age):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "BFF_EXCHANGE_EXPIRED",
                "message": "BFF exchange payload is expired or outside the allowed window.",
            },
        )

    secret = getattr(settings, "bff_shared_secret", "")
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        _canonical_bff_exchange_payload(body),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(body.exchange_signature or "", expected_signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "BFF_EXCHANGE_SIGNATURE_INVALID",
                "message": "BFF exchange signature is invalid.",
            },
        )

    ttl_seconds = max(1, int((expires_at - now).total_seconds()))
    replay_key = f"{BFF_EXCHANGE_NONCE_PREFIX}{body.exchange_nonce}"
    stored = await redis.set(replay_key, "1", nx=True, ex=ttl_seconds)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "BFF_EXCHANGE_REPLAYED",
                "message": "BFF exchange nonce has already been used.",
            },
        )


@router.post(
    "/token",
    response_model=AuthTokenResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def exchange_oauth_profile_for_token(
    body: OAuthProfile,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    _bff: None = Depends(verify_bff_secret),
) -> AuthTokenResponse:
    """
    Exchange an OAuth profile (from BFF) for a Core BE JWT.

    Flow:
      1. BFF calls this endpoint after OAuth login succeeds.
      2. Core BE finds or creates a User.
      3. Core BE returns a JWT access token bound to the user.id.

    Production/staging require the BFF to sign a short-lived exchange envelope.
    Core validates issuer, audience, expiry, nonce replay, and the profile
    fields before minting Core tokens. Provider JWKS verification can replace
    this interim trust boundary later without changing the user-facing flow.
    """
    await verify_bff_exchange_payload(body, redis)
    try:
        user = await get_or_create_user_from_oauth(body, db)
    except UserPendingDeletion as exc:
        await db.rollback()
        log_event("auth.oauth", "token_exchange", "account_pending_deletion", provider=body.provider)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_PENDING_DELETION",
                "message": "Your account is pending deletion. Restore it to continue.",
                "details": {
                    "user_id": str(exc.user_id),
                    "purge_at": exc.purge_at.isoformat() if exc.purge_at else None,
                },
            },
        ) from exc
    except UserBanned as exc:
        await db.rollback()
        log_event("auth.oauth", "token_exchange", "account_banned", provider=body.provider)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_BANNED",
                "message": "Your account has been banned.",
                "details": {
                    "user_id": str(exc.user_id),
                    "banned_until": exc.banned_until.isoformat() if exc.banned_until else None,
                },
            },
        ) from exc
    log_event("auth.oauth", "token_exchange", "ok",
              user_id=str(user.id), provider=body.provider)
    token = await _issue_auth_token(db=db, user=user, request=request)
    await db.commit()
    return AuthTokenResponse(data=token)


# ─── B7 P3 — Linked OAuth accounts ──────────────────────────────────────────


@router.get(
    "/oauth/links",
    response_model=OAuthLinkListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List OAuth providers linked to the current user",
)
async def list_oauth_links(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OAuthLinkListResponse:
    links = await oauth_link_svc.list_links(db=db, user_id=current_user.id)
    return OAuthLinkListResponse(data=[OAuthLinkDTO.model_validate(link) for link in links])


@router.post(
    "/oauth/links/attach",
    response_model=OAuthLinkResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Attach an OAuth provider to a user (BFF-internal; called from settings link flow)",
)
async def attach_oauth_link(
    body: OAuthLinkAttachBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    _bff: None = Depends(verify_bff_secret),
) -> OAuthLinkResponse:
    """Server-to-server endpoint guarded by `X-BFF-Secret`.

    The BFF link callback verifies the user's session, decodes the link-state
    cookie, and posts here with the resolved `user_id` + the OAuth profile.
    Core enforces the conflict and last-method invariants.
    """
    await verify_bff_exchange_payload(body.profile, redis)
    user = await db.get(User, body.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found."},
        )
    try:
        link, _created = await oauth_link_svc.attach_link(
            db=db,
            user_id=body.user_id,
            provider=body.profile.provider,
            provider_account_id=body.profile.provider_account_id,
            email=body.profile.email,
            display_name=body.profile.name,
            avatar_url=body.profile.avatar_url,
        )
    except OAuthLinkConflict as exc:
        await audit(
            db=db,
            event_type=AuditEventTypeEnum.OAUTH_LINK_REJECTED_CONFLICT,
            user_id=body.user_id,
            request=request,
            details={"provider": exc.provider, "owning_user_id": str(exc.owning_user_id)},
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "OAUTH_ACCOUNT_ALREADY_LINKED",
                "message": (
                    f"This {exc.provider} account is already linked to a different user."
                ),
            },
        ) from exc

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.OAUTH_LINK_ADDED,
        user_id=body.user_id,
        request=request,
        details={"provider": link.provider},
    )
    await db.commit()
    return OAuthLinkResponse(data=OAuthLinkDTO.model_validate(link))


@router.delete(
    "/oauth/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Unlink an OAuth provider (refuses to remove the last sign-in method)",
)
async def remove_oauth_link(
    link_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        removed = await oauth_link_svc.unlink(db=db, user=current_user, link_id=link_id)
    except LastSignInMethodError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "LAST_SIGN_IN_METHOD",
                "message": (
                    "You must set a password before unlinking your only sign-in method."
                ),
            },
        ) from exc

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Linked account not found."},
        )

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.OAUTH_LINK_REMOVED,
        user_id=current_user.id,
        request=request,
        details={"link_id": str(link_id)},
    )
    await db.commit()


@router.post(
    "/request-otp",
    response_model=OtpRequestedResponse,
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def request_email_otp(
    body: RequestOtpBody,
    redis: Redis = Depends(get_redis),
    _rate: None = Depends(rate_limit_otp_request),
) -> OtpRequestedResponse:
    """
    Request a one-time password (OTP) to be sent via email.

    - For **reset_password**: email must belong to an existing account.
    - For **login**: checks user existence; returns generic success if not found (prevents enumeration).
    - For **signup**: email must not already be registered; password is HIBP-checked and hashed before Redis storage.
    - Stores OTP in Redis with a 5-minute TTL.
    - Sends OTP to the given email address via SMTP.
    """
    from app.adapters.database import AsyncSessionLocal

    # Compute cooldown key early so all purpose-specific branches can safely use it.
    cooldown_key = f"auth:otp:cooldown:{body.purpose}:{body.email}"

    existing_user = None
    if body.purpose in {"reset_password", "signup", "login", "delete_account"}:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(func.lower(User.email) == body.email.lower())
            )
            existing_user = result.scalar_one_or_none()

            if body.purpose == "reset_password" and existing_user is None:
                # Return generic success to prevent email enumeration
                await redis.setex(cooldown_key, 60, "1")  # Prevent email enumeration
                return OtpRequestedResponse(
                    data=OtpRequested(
                        delivery="email",
                        expires_in_seconds=OTP_TTL_SECONDS,
                        otp=None,
                    )
                )

            if body.purpose == "delete_account" and existing_user is None:
                # Same anti-enumeration treatment as reset_password — never
                # tell a stranger whether an email is registered.
                await redis.setex(cooldown_key, 60, "1")
                return OtpRequestedResponse(
                    data=OtpRequested(
                        delivery="email",
                        expires_in_seconds=OTP_TTL_SECONDS,
                        otp=None,
                    )
                )

            if body.purpose == "signup" and existing_user is not None:
                raise ConflictException(
                    code="EMAIL_TAKEN",
                    message="Email đã được sử dụng",
                    field_errors={"email": "Email đã được sử dụng"},
                )
            if body.purpose in {"login", "reset_password"} and existing_user is not None:
                _raise_if_account_banned(existing_user)

    # Per-email cooldown: same semantics as real OTP sends (incl. login probe for unknown email).
    # Enforced before expensive work; fake login success must still set cooldown to limit enumeration.
    if await redis.exists(cooldown_key):
        from app.exceptions import RateLimitException
        raise RateLimitException(
            message="Vui lòng đợi 60 giây trước khi yêu cầu mã OTP mới",
        )

    if body.purpose == "login" and existing_user is None:
        # Generic success without email — cooldown already enforced and consumed below.
        await redis.setex(cooldown_key, 60, "1")
        return OtpRequestedResponse(
            data=OtpRequested(
                delivery="email",
                expires_in_seconds=OTP_TTL_SECONDS,
                otp=None,
            )
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    otp_key = f"auth:otp:{body.purpose}:{body.email}"

    # For signup: HIBP-check and hash the password before storing in Redis
    if body.purpose == "signup" and body.username:
        import json

        plaintext_password = body.password or ""
        if plaintext_password:
            is_breached, breach_count = await check_password_breach(plaintext_password)
            if is_breached:
                raise ApiException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code="PASSWORD_BREACHED",
                    message="Mật khẩu này đã bị rò rỉ trong các vụ vi phạm dữ liệu. Vui lòng chọn mật khẩu khác.",
                )
            from app.core.security import hash_password
            hashed_pw = hash_password(plaintext_password)
        else:
            hashed_pw = ""

        signup_data = {
            "username": body.username,
            "password": hashed_pw,
            "password_hashed": True,
            "name": body.name or body.email,
        }
        # Signup session lasts 10 minutes (longer than OTP TTL)
        await redis.setex(f"signup:pending:{body.email}", 600, json.dumps(signup_data))

    expires_in_seconds = OTP_TTL_SECONDS

    # Store hashed OTP so plaintext is never recoverable from Redis.
    from app.services.otp import hash_otp_code
    hashed_code = hash_otp_code(code)
    # OTP TTL: 5 minutes (300 s).  Cooldown: 60 s.
    await redis.setex(otp_key, expires_in_seconds, hashed_code)
    await redis.setex(cooldown_key, 60, "1")

    if _should_skip_otp_email_delivery_for_dev():
        logger.warning(
            "Skipping OTP email delivery because SMTP is not configured in debug runtime",
            extra={"purpose": body.purpose},
        )
    else:
        try:
            await asyncio.to_thread(send_otp_email, body.email, code, body.purpose)
        except Exception as exc:  # pragma: no cover - external I/O
            if _can_use_debug_otp_delivery_fallback():
                logger.warning(
                    "OTP email delivery failed in debug runtime; using response OTP echo",
                    extra={"purpose": body.purpose},
                    exc_info=True,
                )
            else:
                # Best-effort cleanup: remove the stored OTP so user can retry
                await redis.delete(otp_key)
                from app.exceptions import ServerException
                raise ServerException(
                    message="Không thể gửi email OTP. Vui lòng thử lại sau.",
                ) from exc

    log_event("auth", "otp_request", "ok", email_hash=hash_email(body.email))

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
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def verify_email_otp(
    body: VerifyOtpBody,
    request: Request,
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
    from app.services.otp import hash_otp_code as _hash_otp
    otp_record = await get_latest_active_otp(db, body.email, body.purpose)
    if otp_record is not None and otp_record.attempts_left <= 0:
        await redis.delete(key)
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_LOCKED",
            message="Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
        )

    # Peek (not consume yet) — we need the stored hash to validate before deleting
    stored_hash = await redis.get(key)
    if stored_hash is None:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_INVALID",
            message="Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
        )

    submitted_hash = _hash_otp(body.code)
    if stored_hash != submitted_hash:
        remaining_attempts = None
        if otp_record is not None:
            remaining_attempts = await decrement_attempts(db, otp_record)
            await db.commit()
            if remaining_attempts <= 0:
                await redis.delete(key)
        log_event("auth", "otp_verify", "invalid", email_hash=hash_email(body.email))
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_INVALID",
            message="Mã OTP không đúng",
        )

    # Atomically consume the OTP — GETDEL prevents two concurrent requests from
    # both reading the valid hash before either deletes it (TOCTOU).
    consumed = await redis_getdel_compat(redis, key)
    if consumed is None:
        # Another concurrent request consumed the OTP first
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_INVALID",
            message="Mã OTP đã được sử dụng. Vui lòng yêu cầu mã mới.",
        )
    if otp_record is not None:
        await mark_otp_consumed(db, otp_record)

    # ── reset_password: verify only — do NOT create a new user ──────────────
    if body.purpose == "reset_password":
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if user is None:
            raise NotFoundException(
                resource="Email",
                message="Không tìm thấy tài khoản với email này",
                code="ACCOUNT_NOT_FOUND_EMAIL",
            )
        _raise_if_account_banned(user)
        # Store a "verified" marker so reset-password can proceed (TTL 5 min)
        verified_key = f"auth:otp:reset_verified:{body.email}"
        await redis.setex(verified_key, OTP_TTL_SECONDS, "1")
        await db.commit()
        return OtpVerifiedResponse(
            data=OtpVerified(email=body.email, next_step="reset_password")
        )

    if body.purpose == "delete_account":
        result = await db.execute(
            select(User).where(func.lower(User.email) == body.email.lower())
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise NotFoundException(
                resource="Email",
                message="Không tìm thấy tài khoản với email này",
                code="ACCOUNT_NOT_FOUND_EMAIL",
            )
        _raise_if_account_banned(user)
        verified_key = f"auth:otp:delete_account_verified:{user.email}"
        await redis.setex(verified_key, OTP_TTL_SECONDS, "1")
        await db.commit()
        return OtpVerifiedResponse(
            data=OtpVerified(email=user.email, next_step="delete_account")
        )

    # ── login: verify OTP for existing user, return JWT ─────────────────────
    if body.purpose == "login":
        result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == body.email)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise UnauthorizedException(
                message="Không tìm thấy tài khoản với email này",
                code="INVALID_CREDENTIALS",
            )
        _raise_if_account_banned(user)
        if user.email_verified_at is None:
            user.email_verified_at = datetime.now(timezone.utc)
        log_event("auth", "otp_verify", "ok", user_id=str(user.id))
        token = await _issue_auth_token(db=db, user=user, request=request)
        await db.commit()
        return AuthTokenResponse(data=token)

    # ── signup: create / fetch user and issue JWT ────────────────────────────

    # Read signup data from Redis (stored by request-otp)
    signup_key = f"signup:pending:{body.email}"
    signup_data_raw = await redis.get(signup_key)

    if signup_data_raw is None and body.purpose == "signup":
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SESSION_EXPIRED",
            message="Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.",
        )

    # Parse signup data from Redis
    signup_data: dict = {}
    if signup_data_raw:
        import json
        try:
            signup_data = json.loads(signup_data_raw)
        except json.JSONDecodeError:
            pass

    # Get username and password from Redis (not request body)
    username = signup_data.get("username")
    password = signup_data.get("password")
    password_hashed = signup_data.get("password_hashed", False)
    name = signup_data.get("name", body.email)

    synthetic_profile = OAuthProfile(
        provider="otp",
        provider_account_id=body.email,
        email=body.email,
        name=name,
        avatar_url=None,
    )
    try:
        user = await get_or_create_user_from_oauth(synthetic_profile, db)
    except IntegrityError:
        # Race condition: two simultaneous signups for the same email.
        # Rollback and fetch the now-existing user.
        await db.rollback()
        from sqlalchemy import select as _select
        result = await db.execute(
            _select(User)
            .options(selectinload(User.profile))
            .where(User.email == body.email)
        )

        user = result.scalar_one()
    except UserBanned as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_BANNED",
                "message": "Your account has been banned.",
                "details": {
                    "user_id": str(exc.user_id),
                    "banned_until": exc.banned_until.isoformat() if exc.banned_until else None,
                },
            },
        ) from exc
    except Exception as exc:
        from app.exceptions import ServerException
        raise ServerException(
            message="Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.",
        ) from exc

    # Set password (already bcrypt-hashed from request-otp step) and username.
    # `has_password=True` flips the OAuth-only protection off so account
    # deletion / unlink-last-method paths use the password identity check.
    if password:
        if password_hashed:
            user.hashed_password = password
        else:
            from app.core.security import hash_password
            user.hashed_password = hash_password(password)
        user.has_password = True

    # Mark email as verified since OTP confirms ownership
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(timezone.utc)

    if username:
        user.username = username.lower().strip()

    if name and name != body.email:
        user.display_name = name

    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        # Username collision: another user registered the same username between
        # OTP issuance and verification. Return a descriptive 409 rather than 500.
        if "username" in str(exc.orig).lower() or "users_username_key" in str(exc.orig).lower():
            raise ConflictException(
                code="USERNAME_TAKEN",
                message="Tên người dùng đã được sử dụng. Vui lòng chọn tên khác.",
                field_errors={"username": "Tên người dùng đã được sử dụng"},
            ) from exc
        raise ConflictException(
            code="CONFLICT",
            message="Đã xảy ra xung đột dữ liệu. Vui lòng thử lại.",
        ) from exc

    token = await _issue_auth_token(db=db, user=user, request=request)
    await db.commit()
    if signup_data_raw:
        await redis.delete(signup_key)
    return AuthTokenResponse(data=token)


@router.post(
    "/reset-password",
    response_model=AuthTokenResponse,
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def reset_password(
    body: ResetPasswordBody,
    request: Request,
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
    if await redis.get(verified_key) is None:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_REQUIRED",
            message="Vui lòng xác thực OTP trước khi đặt lại mật khẩu.",
        )

    from app.core.security import hash_password

    # HIBP check before allowing a potentially breached password to be set
    is_breached, _ = await check_password_breach(body.new_password)
    if is_breached:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PASSWORD_BREACHED",
            message="Mật khẩu này đã bị rò rỉ trong các vụ vi phạm dữ liệu. Vui lòng chọn mật khẩu khác.",
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.email == body.email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException(
            resource="Email",
            message="Không tìm thấy tài khoản với email này",
            code="ACCOUNT_NOT_FOUND_EMAIL",
        )
    _raise_if_account_banned(user)

    consumed = await redis_getdel_compat(redis, verified_key)
    if consumed is None:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OTP_REQUIRED",
            message="Vui lòng xác thực OTP trước khi đặt lại mật khẩu.",
        )

    user.hashed_password = hash_password(body.new_password)
    user.has_password = True
    await revoke_refresh_tokens_for_user(db, user_id=user.id)
    token = await _issue_auth_token(db=db, user=user, request=request)
    await db.commit()
    return AuthTokenResponse(data=token)


@router.post(
    "/check-password-breach",
    responses={410: {"model": ErrorResponse}},
    deprecated=True,
)
async def check_password_breach_endpoint() -> None:
    """
    Removed — use ``GET /auth/check-password-breach/range/{prefix}`` instead.
    """
    raise ApiException(
        status_code=status.HTTP_410_GONE,
        code="ENDPOINT_GONE",
        message="Endpoint gone — use GET /v1/auth/check-password-breach/range/{prefix} (HIBP k-anonymity).",
    )


@router.get(
    "/check-password-breach/range/{prefix}",
    response_class=PlainTextResponse,
    responses={
        200: {"content": {"text/plain": {}}},
        400: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def check_password_breach_range_endpoint(prefix: str) -> PlainTextResponse:
    """
    Proxy to the HaveIBeenPwned range API for client-side k-anonymity.

    The browser computes ``SHA1(password).upper()`` locally, sends only the
    first 5 hex characters, and matches the suffix against the returned list
    in-process. This guarantees the plaintext password never leaves the
    browser, transits the BFF, or appears in a backend log.
    """
    import re
    import httpx

    if not re.fullmatch(r"[0-9A-Fa-f]{5}", prefix):
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_PREFIX",
            message="Prefix must be exactly 5 hexadecimal characters.",
        )

    upstream_url = f"https://api.pwnedpasswords.com/range/{prefix.upper()}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            upstream = await client.get(
                upstream_url,
                headers={"User-Agent": "HealthOS-Auth"},
            )
    except Exception:
        raise ApiException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="UPSTREAM_ERROR",
            message="HIBP service unavailable.",
        )

    if upstream.status_code != 200:
        raise ApiException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="UPSTREAM_ERROR",
            message="HIBP service returned an unexpected status.",
        )

    return PlainTextResponse(content=upstream.text)


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    responses={401: {"model": ErrorResponse}},
)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """Return the currently authenticated user."""
    roles, permissions = await _rbac_snapshot(db, current_user.id)
    return CurrentUserResponse(
        data=CurrentUser(
            id=str(current_user.id),
            email=current_user.email,
            username=current_user.username,
            display_name=current_user.display_name,
            avatar_url=current_user.profile.avatar_url
            if current_user.profile is not None
            else None,
            onboarding_status=current_user.onboarding_status,
            onboarding_completed_at=current_user.onboarding_completed_at.isoformat()
            if current_user.onboarding_completed_at
            else None,
            roles=roles,
            permissions=permissions,
        )
    )


from fastapi.security import HTTPAuthorizationCredentials


@router.post(
    "/refresh",
    response_model=AuthTokenResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
async def refresh_access_token(
    body: RefreshTokenBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    try:
        user, next_refresh_token = await rotate_refresh_token(
            db,
            refresh_token=body.refresh_token,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except RefreshTokenUserBannedError as exc:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except RefreshTokenReuseError as exc:
        await db.commit()
        raise UnauthorizedException(code=exc.code, message=exc.message)
    except RefreshTokenError as exc:
        await db.commit()
        raise UnauthorizedException(code=exc.code, message=exc.message)

    _raise_if_account_banned(user)
    access_token = create_user_access_token(user)
    roles, permissions = await _rbac_snapshot(db, user.id)
    token = AuthToken(
        access_token=access_token,
        refresh_token=next_refresh_token,
        user_id=str(user.id),
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile is not None else None,
        onboarding_status=user.onboarding_status,
        roles=roles,
        permissions=permissions,
    )
    await db.commit()
    return AuthTokenResponse(data=token)


@router.post(
    "/logout",
    responses={200: {"model": dict}},
)
async def logout(
    body: LogoutBody | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke the current JWT by adding its jti to the Redis blacklist.

    Idempotent — returns 200 even if the token is already revoked or expired.
    Does not require a valid session (no get_current_user dependency) so retry
    after network failure still succeeds.
    """
    if body and body.refresh_token:
        await revoke_refresh_token(db, refresh_token=body.refresh_token)
    if credentials and credentials.credentials:
        await revoke_token(credentials.credentials, redis)
    await db.commit()
    return {"data": {"success": True}}
