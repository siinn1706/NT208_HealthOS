"""MFA (TOTP) endpoints for authentication."""
from __future__ import annotations

import logging
import secrets
from io import BytesIO

import pyotp
import qrcode
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit_mfa, rate_limit_otp_request
from app.services.auth import record_failed_login
from app.exceptions import ApiException, UnauthorizedException
from app.models.core import User
from app.schemas.common import DataResponse
from app.services.mfa import encrypt_totp_secret, totp_service
from app.services.security_logging import log_security_event
from app.models.audit import AuditEventTypeEnum

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mfa", tags=["MFA"])


# ─── Schemas ───────────────────────────────────────────────────────────────────
class MFASetupResponse(BaseModel):
    """Response for MFA setup initiation."""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    recovery_codes: list[str]  # One-time codes, shown only once


class MFAVerifyRequest(BaseModel):
    """Request body for verifying MFA code."""
    code: str


class MFASetupVerifyRequest(BaseModel):
    """Request body for verifying MFA setup."""
    code: str


class MFAStatusResponse(BaseModel):
    """Response for MFA status check."""
    enabled: bool


class MFASetupResponseData(BaseModel):
    """Wrapper for MFA setup response."""
    enabled: bool
    recovery_codes: list[str] | None = None


# ─── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/status", response_model=DataResponse[MFAStatusResponse])
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
) -> DataResponse[MFAStatusResponse]:
    """Check if MFA is enabled for the current user."""
    return DataResponse(
        data=MFAStatusResponse(enabled=current_user.mfa_enabled)
    )


@router.post("/setup", response_model=DataResponse[MFASetupResponse])
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataResponse[MFASetupResponse]:
    """Initialize MFA setup for the current user.

    Returns the TOTP secret, QR code image, and recovery codes.
    The user must verify with a TOTP code to complete setup.
    """
    if current_user.mfa_enabled:
        raise ApiException(
            status_code=400,
            code="MFA_ALREADY_ENABLED",
            message="MFA is already enabled for this account",
        )

    # Generate plaintext secret and recovery codes
    plaintext_secret = totp_service.generate_secret()
    plaintext_recovery_codes = totp_service.generate_recovery_codes(8)

    # Generate QR code using plaintext secret (user will scan this)
    uri = totp_service.get_provisioning_uri(plaintext_secret, current_user.email)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_code = buffer.getvalue()

    import base64
    qr_code_b64 = base64.b64encode(qr_code).decode()

    # Store Fernet-encrypted secret and bcrypt-hashed recovery codes
    encrypted_secret = encrypt_totp_secret(plaintext_secret)
    totp_probe = pyotp.TOTP(plaintext_secret)
    if not totp_service.verify(encrypted_secret, totp_probe.now()):
        raise ApiException(
            status_code=500,
            code="MFA_STORAGE_MISCONFIGURED",
            message="MFA could not be initialized. Verify TOTP encryption configuration.",
        )

    current_user.mfa_secret = encrypted_secret
    current_user.mfa_recovery_codes = totp_service.hash_recovery_codes(plaintext_recovery_codes)
    await db.commit()

    # Return plaintext codes to user — this is the ONLY time they are shown
    return DataResponse(
        data=MFASetupResponse(
            secret=plaintext_secret,
            qr_code=qr_code_b64,
            recovery_codes=plaintext_recovery_codes,
        )
    )


@router.post("/verify-setup", response_model=DataResponse[MFASetupResponseData])
async def verify_mfa_setup(
    body: MFASetupVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataResponse[MFASetupResponseData]:
    """Verify TOTP code to complete MFA setup."""
    if not current_user.mfa_secret:
        raise ApiException(
            status_code=400,
            code="MFA_NOT_SETUP",
            message="MFA setup has not been initiated",
        )

    # Verify the TOTP code
    if not totp_service.verify(current_user.mfa_secret, body.code):
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_FAILED,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "setup_verification_failed"},
        )
        raise UnauthorizedException(
            code="INVALID_TOTP_CODE",
            message="Invalid verification code. Please try again.",
        )

    # Enable MFA
    current_user.mfa_enabled = True
    await db.commit()
    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_ENABLED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return DataResponse(
        data=MFASetupResponseData(enabled=True)
    )


@router.post("/verify", response_model=DataResponse[dict])
async def verify_mfa(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit_mfa),
) -> DataResponse[dict]:
    """Verify TOTP code or recovery code for MFA."""
    locked_user = (
        await db.execute(
            select(User).where(User.id == current_user.id).with_for_update()
        )
    ).scalar_one_or_none()

    if locked_user is None:
        raise UnauthorizedException(
            code="AUTH_NOT_FOUND",
            message="User not found.",
        )

    if not locked_user.mfa_enabled or not locked_user.mfa_secret:
        await db.rollback()
        raise UnauthorizedException(
            code="MFA_NOT_ENABLED",
            message="MFA is not enabled for this account",
        )

    # Check recovery codes first (handles both hashed and legacy plaintext codes)
    if locked_user.mfa_recovery_codes:
        is_valid, remaining = totp_service.verify_recovery_code(
            body.code,
            locked_user.mfa_recovery_codes,
        )
        if is_valid:
            locked_user.mfa_recovery_codes = remaining
            try:
                await db.commit()
            except SQLAlchemyError as exc:
                await db.rollback()
                logger.exception("MFA recovery code persist failed")
                raise ApiException(
                    status_code=503,
                    code="MFA_STATE_SAVE_FAILED",
                    message="Could not update MFA state. Please try again.",
                ) from exc
            await log_security_event(
                db,
                AuditEventTypeEnum.MFA_VERIFIED,
                user_id=locked_user.id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"method": "recovery_code"},
            )
            return DataResponse(
                data={"verified": True, "method": "recovery_code"}
            )

    # Verify TOTP code
    if totp_service.verify(locked_user.mfa_secret, body.code):
        await db.rollback()
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_VERIFIED,
            user_id=locked_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"method": "totp"},
        )
        return DataResponse(
            data={"verified": True, "method": "totp"}
        )

    await db.rollback()
    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_FAILED,
        user_id=locked_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"reason": "invalid_totp_code"},
    )
    # Increment account lockout counter so repeated MFA failures trigger lockout
    await record_failed_login(db, locked_user)
    raise UnauthorizedException(
        code="INVALID_TOTP_CODE",
        message="Invalid verification code",
    )


@router.post("/disable", response_model=DataResponse[MFASetupResponseData])
async def disable_mfa(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rate: None = Depends(rate_limit_otp_request),
) -> DataResponse[MFASetupResponseData]:
    """Disable MFA. Requires TOTP code verification."""
    if not current_user.mfa_enabled:
        raise ApiException(
            status_code=400,
            code="MFA_NOT_ENABLED",
            message="MFA is not enabled for this account",
        )

    # Verify before disabling
    if not totp_service.verify(current_user.mfa_secret, body.code):
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_FAILED,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "disable_verification_failed"},
        )
        raise UnauthorizedException(
            code="INVALID_TOTP_CODE",
            message="Invalid verification code. Cannot disable MFA.",
        )

    # Disable MFA
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_recovery_codes = None
    await db.commit()
    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_DISABLED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return DataResponse(
        data=MFASetupResponseData(enabled=False)
    )


@router.post("/regenerate-recovery-codes", response_model=DataResponse[MFASetupResponseData])
async def regenerate_recovery_codes(
    body: MFAVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit_mfa),
) -> DataResponse[MFASetupResponseData]:
    """Generate new recovery codes. Requires a valid TOTP code. Invalidates all existing codes."""
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise UnauthorizedException(
            code="MFA_NOT_ENABLED",
            message="MFA is not enabled for this account",
        )

    if not totp_service.verify(current_user.mfa_secret, body.code):
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_FAILED,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "recovery_regen_invalid_totp"},
        )
        raise UnauthorizedException(
            code="INVALID_TOTP_CODE",
            message="Invalid verification code.",
        )

    # Generate new codes — plaintext returned once, hashed for storage
    plaintext_codes = totp_service.generate_recovery_codes(8)
    current_user.mfa_recovery_codes = totp_service.hash_recovery_codes(plaintext_codes)
    await db.commit()

    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_RECOVERY_REGENERATED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return DataResponse(
        data=MFASetupResponseData(
            enabled=True,
            recovery_codes=plaintext_codes,
        )
    )
