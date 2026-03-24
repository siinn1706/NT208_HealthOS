"""MFA (TOTP) endpoints for authentication."""
from __future__ import annotations

import logging
import secrets
from io import BytesIO

import pyotp
import qrcode
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.exceptions import ApiException, UnauthorizedException
from app.models.core import User
from app.schemas.common import DataResponse
from app.services.mfa import totp_service
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

    # Generate secret and recovery codes
    secret = totp_service.generate_secret()
    recovery_codes = totp_service.generate_recovery_codes(8)

    # Generate QR code
    uri = totp_service.get_provisioning_uri(secret, current_user.email)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_code = buffer.getvalue()

    import base64
    qr_code_b64 = base64.b64encode(qr_code).decode()

    # Store secret temporarily (not enabled yet)
    current_user.mfa_secret = secret
    current_user.mfa_recovery_codes = recovery_codes
    await db.commit()

    return DataResponse(
        data=MFASetupResponse(
            secret=secret,
            qr_code=qr_code_b64,
            recovery_codes=recovery_codes,
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
) -> DataResponse[dict]:
    """Verify TOTP code or recovery code for MFA."""
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise UnauthorizedException(
            code="MFA_NOT_ENABLED",
            message="MFA is not enabled for this account",
        )

    # Check recovery codes first
    if current_user.mfa_recovery_codes:
        is_valid, remaining = totp_service.verify_recovery_code(
            body.code,
            current_user.mfa_recovery_codes,
        )
        if is_valid:
            await log_security_event(
                db,
                AuditEventTypeEnum.MFA_VERIFIED,
                user_id=current_user.id,
                ip_address=request.client.host if request.client else None,
                details={"method": "recovery_code"},
            )
            return DataResponse(
                data={"verified": True, "method": "recovery_code"}
            )

    # Verify TOTP code
    if totp_service.verify(current_user.mfa_secret, body.code):
        await log_security_event(
            db,
            AuditEventTypeEnum.MFA_VERIFIED,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            details={"method": "totp"},
        )
        return DataResponse(
            data={"verified": True, "method": "totp"}
        )

    await log_security_event(
        db,
        AuditEventTypeEnum.MFA_FAILED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        details={"reason": "invalid_totp_code"},
    )
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
    )

    return DataResponse(
        data=MFASetupResponseData(enabled=False)
    )
