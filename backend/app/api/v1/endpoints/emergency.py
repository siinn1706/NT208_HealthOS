"""Emergency Health Card — owner-side endpoints.

All endpoints in this module require an authenticated session
(`get_current_user`). The unauthenticated public-card route lives in a
separate file (`emergency_public.py`) so reviewers can see at a glance
which routes skip auth.

Endpoints (router prefix `/users/me/emergency-profile`):

  GET    /                       — derived preview + tokens + completeness
  PATCH  /                       — update overrides + visibility + master switch
  POST   /tokens                 — mint a new QR token (returns plaintext + QR data URL)
  GET    /tokens                 — list tokens (active + revoked)
  DELETE /tokens/{id}            — revoke a single token
  POST   /tokens/revoke-all      — mass-revoke
  GET    /access-logs            — owner-scoped audit trail
"""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.audit import AuditEventTypeEnum
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.emergency import (
    EmergencyAccessLogListResponse,
    EmergencyProfileOwnerResponse,
    EmergencyProfileUpdate,
    EmergencyShareTokenCreateBody,
    EmergencyShareTokenListResponse,
    EmergencyShareTokenWithSecretDTO,
    EmergencyShareTokenWithSecretResponse,
)
from app.services import emergency_profile as emergency_svc
from app.services.audit import audit
from app.services.emergency_profile import (
    CardNotPublished,
    InsufficientProfile,
    TokenNotFound,
    TooManyActiveTokens,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users/me/emergency-profile", tags=["Emergency Card"])


@router.get(
    "",
    response_model=EmergencyProfileOwnerResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get the owner's emergency-card preview, overrides, tokens, and completeness nudges.",
)
async def get_emergency_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyProfileOwnerResponse:
    view = await emergency_svc.get_owner_view(db, user=current_user)
    return EmergencyProfileOwnerResponse(data=view)


@router.patch(
    "",
    response_model=EmergencyProfileOwnerResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
    summary="Update overrides + master publish switch + per-field visibility.",
)
async def update_emergency_profile(
    body: EmergencyProfileUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyProfileOwnerResponse:
    profile_row = await emergency_svc.get_or_create_profile(db, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    publish_transitioned_on = False
    for field, value in update_data.items():
        if field == "is_published":
            previous = bool(profile_row.is_published)
            profile_row.is_published = bool(value)
            if value and not previous:
                publish_transitioned_on = True
                profile_row.last_published_at = datetime.datetime.now(
                    datetime.timezone.utc
                )
        else:
            setattr(profile_row, field, value)

    await db.flush()

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.EMERGENCY_PROFILE_UPDATED,
        user_id=current_user.id,
        request=request,
        details={
            "fields": sorted(update_data.keys()),
            "is_published": profile_row.is_published,
            "publish_turned_on": publish_transitioned_on,
        },
    )
    await db.commit()

    view = await emergency_svc.get_owner_view(db, user=current_user)
    return EmergencyProfileOwnerResponse(data=view)


@router.post(
    "/tokens",
    response_model=EmergencyShareTokenWithSecretResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Mint a new QR share token. Plaintext token + QR data URL are returned ONCE.",
)
async def mint_emergency_token(
    body: EmergencyShareTokenCreateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyShareTokenWithSecretResponse:
    """Mint a new QR share token. Plaintext + QR + wallet PDF returned ONCE.

    H5 atomicity — the rendering pipeline runs BEFORE any DB write so a
    render failure cannot leave an orphan token row in the database.
    Order:
      1. Preflight (cheap DB read of profile + completeness gate values).
      2. Generate plaintext + hash + share URL (in-memory).
      3. Render QR (raises on failure → no token written).
      4. Render wallet PDF (returns None on failure → continue without).
      5. Insert token row + flush.
      6. Audit (commits the transaction).
      7. Compose response.
    """
    # Step 1 — preflight. Cheap; we only need (is_published, completeness_score,
    # max_active_tokens, missing_critical_fields). Not yet committing anything.
    preflight = await emergency_svc.mint_preflight(db, user=current_user)

    # Surface the friendly 4xx reasons before doing any expensive rendering.
    if not preflight.is_published:
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="CARD_NOT_PUBLISHED",
            message=(
                "Publish your emergency card before minting a QR token. "
                "Toggle 'Publish' in the dashboard."
            ),
        )
    if (
        preflight.completeness_score < emergency_svc.COMPLETENESS_PUBLISH_THRESHOLD
        and not body.acknowledge_low_completeness
    ):
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="INSUFFICIENT_PROFILE",
            message=(
                "Your emergency profile is below the recommended completeness. "
                "Resolve the missing-critical-fields nudges, or re-submit with "
                "`acknowledge_low_completeness=true`."
            ),
            details={
                "completeness_score": preflight.completeness_score,
                "missing_critical_fields": preflight.missing_critical_fields,
            },
        )

    # Step 2 — generate the secret material. Pure function, no DB.
    plaintext, digest, share_url = emergency_svc.prepare_token_secret()

    # Step 3 — render the QR. Failure here aborts the mint cleanly.
    qr_data_url = emergency_svc.render_qr_for_share_url(share_url)

    # Step 4 — render the wallet PDF off the event loop. Returns None on
    # missing WeasyPrint; the FE simply omits the download button.
    from app.services.wallet_pdf import render_wallet_card_data_url_async

    wallet_pdf_data_url = await render_wallet_card_data_url_async(
        card=preflight.card,
        qr_data_url=qr_data_url,
        locale=preflight.preferred_language or "en",
        # Card short ID is generated from the token UUID after insert; pass
        # None here and let the wallet PDF use the token UUID prefix below.
        card_short_id=None,
    )

    # Step 5 — DB insert. Wraps the cap check in SELECT … FOR UPDATE.
    try:
        token = await emergency_svc.mint_token(
            db,
            user=current_user,
            label=body.label,
            digest=digest,
            completeness_score=preflight.completeness_score,
            is_published=preflight.is_published,
            acknowledge_low_completeness=body.acknowledge_low_completeness,
        )
    except (CardNotPublished, InsufficientProfile) as exc:  # pragma: no cover — preflight catches these
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="PREFLIGHT_INVARIANT_BROKEN",
            message=str(exc),
        ) from exc
    except TooManyActiveTokens as exc:
        # Race: the preflight didn't see the cap, but a concurrent mint
        # crossed it before our FOR UPDATE landed.
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="TOO_MANY_ACTIVE_TOKENS",
            message=(
                "You already have the maximum number of active QR tokens. "
                "Revoke one before minting a new card."
            ),
            details={"max_active_tokens": preflight.max_active_tokens},
        ) from exc

    # Step 6 — audit + commit.
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.EMERGENCY_TOKEN_CREATED,
        user_id=current_user.id,
        request=request,
        details={
            "token_id": str(token.id),
            "label": token.label,
            "wallet_pdf_rendered": wallet_pdf_data_url is not None,
        },
    )
    await db.commit()

    # Step 7 — compose response. The card_short_id is the token UUID prefix,
    # available only after insert; included in the owner-side payload only.
    payload = EmergencyShareTokenWithSecretDTO(
        token_meta=emergency_svc.to_token_dto(token),
        token=plaintext,
        share_url=share_url,
        qr_png_data_url=qr_data_url,
        wallet_pdf_data_url=wallet_pdf_data_url,
    )
    return EmergencyShareTokenWithSecretResponse(data=payload)


@router.get(
    "/tokens",
    response_model=EmergencyShareTokenListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List active + revoked tokens for the owner manager UI.",
)
async def list_emergency_tokens(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyShareTokenListResponse:
    tokens = await emergency_svc.list_tokens(db, current_user.id)
    return EmergencyShareTokenListResponse(
        data=[emergency_svc.to_token_dto(t) for t in tokens]
    )


@router.delete(
    "/tokens/{token_id}",
    response_model=EmergencyShareTokenListResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Revoke a single QR token. Idempotent.",
)
async def revoke_emergency_token(
    token_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyShareTokenListResponse:
    try:
        await emergency_svc.revoke_token(
            db, user_id=current_user.id, token_id=token_id
        )
    except TokenNotFound as exc:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Token not found.",
        ) from exc

    await audit(
        db=db,
        event_type=AuditEventTypeEnum.EMERGENCY_TOKEN_REVOKED,
        user_id=current_user.id,
        request=request,
        details={"token_id": str(token_id)},
    )
    await db.commit()

    tokens = await emergency_svc.list_tokens(db, current_user.id)
    return EmergencyShareTokenListResponse(
        data=[emergency_svc.to_token_dto(t) for t in tokens]
    )


@router.post(
    "/tokens/revoke-all",
    response_model=EmergencyShareTokenListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Revoke every active QR token in one transaction.",
)
async def revoke_all_emergency_tokens(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmergencyShareTokenListResponse:
    revoked = await emergency_svc.revoke_all_for_user(db, current_user.id)
    if revoked > 0:
        await audit(
            db=db,
            event_type=AuditEventTypeEnum.EMERGENCY_TOKEN_REVOKED,
            user_id=current_user.id,
            request=request,
            details={"revoked_count": revoked, "scope": "all"},
        )
    await db.commit()

    tokens = await emergency_svc.list_tokens(db, current_user.id)
    return EmergencyShareTokenListResponse(
        data=[emergency_svc.to_token_dto(t) for t in tokens]
    )


@router.get(
    "/access-logs",
    response_model=EmergencyAccessLogListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Last N public-access entries — owner-scoped, scrubbed IP, no PHI.",
)
async def list_emergency_access_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    token_id: Optional[uuid.UUID] = Query(default=None),
) -> EmergencyAccessLogListResponse:
    rows = await emergency_svc.list_access_logs(
        db, user_id=current_user.id, limit=limit, token_id=token_id
    )
    return EmergencyAccessLogListResponse(
        data=[emergency_svc.to_access_log_dto(r) for r in rows]
    )
