"""Pre-Visit Brief REST endpoints.

Surface (mounted under `/v1/visit-briefs`):

    GET    /                              list briefs (paginated, filter by status)
    POST   /                              create draft (optionally pre-attach)
    GET    /{id}                          full hydrated brief + latest triage
    PATCH  /{id}                          update visit_type / title (drafts only)
    DELETE /{id}                          archive (soft)

    POST   /{id}/symptoms                 add symptom (recomputes triage)
    PATCH  /{id}/symptoms/{sid}           edit symptom (recomputes triage)
    DELETE /{id}/symptoms/{sid}           delete symptom (recomputes triage)

    POST   /{id}/route-now                idempotent recompute on demand
    GET    /{id}/triage-history           append-only audit list

    GET    /{id}/questions/suggested      curated suggestion query (faceted)
    PATCH  /{id}/questions                whole-list replace (≤10 items)

    POST   /{id}/finalize                 lock + bump revision
    POST   /{id}/attach                   attach to appointment
    DELETE /{id}/attach/{linkId}          detach from appointment

Auth: every endpoint requires `Depends(get_current_user)`. Service layer
scopes by `current_user.id` for IDOR safety.
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.core import User
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.visit_briefs import (
    AppointmentBriefLinkDTO,
    AppointmentBriefLinkResponse,
    AttachBriefBody,
    ConcernCategoryLiteral,
    QuestionItem,
    QuestionSetDTO,
    QuestionSetReplaceBody,
    QuestionSetResponse,
    QuestionTemplateDTO,
    QuestionTemplateListResponse,
    SymptomEntryCreateBody,
    SymptomEntryDTO,
    SymptomEntryResponse,
    SymptomEntryUpdateBody,
    TriageOutcomeDTO,
    TriageOutcomeListResponse,
    TriageOutcomeResponse,
    VisitBriefCreateBody,
    VisitBriefDetailDTO,
    VisitBriefDTO,
    VisitBriefListResponse,
    VisitBriefResponse,
    VisitBriefStatusLiteral,
    VisitBriefUpdateBody,
    VisitTypeLiteral,
)
from app.services import question_bank as qb_svc
from app.services import visit_briefs as svc
from app.services.security_logging import log_resource_access_denied
from app.services.visit_brief_pdf import PdfRenderUnavailable, render_pdf
from app.services.visit_briefs import (
    AppointmentNotFound,
    BriefNotEditable,
    BriefNotFound,
    FinalizationRequirementsUnmet,
    TooManyQuestions,
    TooManySymptoms,
)


router = APIRouter(prefix="/visit-briefs", tags=["Visit Briefs"])


# ─────────────────────────────────────────────────────────────────────────────
# Rate limits — review fix M5.
# Both helpers follow the same INCR + TTL pattern used by reports.py so we
# stay consistent with the existing per-user rate-limit story.
# ─────────────────────────────────────────────────────────────────────────────

_ROUTE_NOW_KEY = "rate:visit-briefs.route-now:{user_id}"
_ROUTE_NOW_MAX = 60
_ROUTE_NOW_WINDOW_S = 60 * 60  # 60 recomputes per rolling hour per user

_PDF_KEY = "rate:visit-briefs.pdf:{user_id}"
_PDF_MAX = 10
_PDF_WINDOW_S = 60 * 60  # 10 PDFs per rolling hour per user


async def _enforce_rate_limit(
    redis: Redis,
    *,
    key_template: str,
    max_calls: int,
    window_s: int,
    user_id: uuid.UUID,
    code: str,
    message: str,
) -> None:
    key = key_template.format(user_id=user_id)
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_s)
    if current > max_calls:
        ttl = await redis.ttl(key)
        raise ApiException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code=code,
            message=message,
            details={"retry_after_s": max(60, int(ttl) if ttl else window_s)},
        )


async def _enforce_route_now_rate_limit(redis: Redis, user_id: uuid.UUID) -> None:
    await _enforce_rate_limit(
        redis,
        key_template=_ROUTE_NOW_KEY,
        max_calls=_ROUTE_NOW_MAX,
        window_s=_ROUTE_NOW_WINDOW_S,
        user_id=user_id,
        code="RATE_LIMITED",
        message=f"You can recompute routing at most {_ROUTE_NOW_MAX} times per hour.",
    )


async def _enforce_pdf_rate_limit(redis: Redis, user_id: uuid.UUID) -> None:
    await _enforce_rate_limit(
        redis,
        key_template=_PDF_KEY,
        max_calls=_PDF_MAX,
        window_s=_PDF_WINDOW_S,
        user_id=user_id,
        code="RATE_LIMITED",
        message=f"You can request at most {_PDF_MAX} PDFs per hour.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _http_400(code: str, message: str) -> ApiException:
    return ApiException(
        status_code=status.HTTP_400_BAD_REQUEST,
        code=code,
        message=message,
    )


def _http_404(code: str, message: str) -> ApiException:
    return ApiException(
        status_code=status.HTTP_404_NOT_FOUND,
        code=code,
        message=message,
    )


def _http_409(code: str, message: str) -> ApiException:
    return ApiException(
        status_code=status.HTTP_409_CONFLICT,
        code=code,
        message=message,
    )


def _hydrate_brief_dto(brief, latest_triage) -> VisitBriefDetailDTO:
    """Project an ORM VisitBrief (with eager-loaded children) into the
    detailed response DTO. The latest TriageOutcome is passed in separately
    so we don't re-query the relationship."""
    return VisitBriefDetailDTO(
        id=brief.id,
        user_id=brief.user_id,
        visit_type=brief.visit_type,
        status=brief.status,
        revision=brief.revision,
        title=brief.title,
        finalized_at=brief.finalized_at,
        archived_at=brief.archived_at,
        created_at=brief.created_at,
        updated_at=brief.updated_at,
        symptoms=[SymptomEntryDTO.model_validate(s) for s in brief.symptoms],
        latest_triage=(
            TriageOutcomeDTO.model_validate(latest_triage) if latest_triage else None
        ),
        question_set=(
            QuestionSetDTO.model_validate(brief.question_set)
            if brief.question_set
            else None
        ),
        appointment_links=[
            AppointmentBriefLinkDTO.model_validate(l) for l in brief.appointment_links
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Brief CRUD
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=VisitBriefListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List visit briefs",
)
async def list_briefs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: Optional[VisitBriefStatusLiteral] = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
) -> VisitBriefListResponse:
    items, total = await svc.list_briefs(
        db=db,
        user_id=current_user.id,
        status=status_filter,
        page=page,
        per_page=per_page,
    )
    return VisitBriefListResponse(
        data=[VisitBriefDTO.model_validate(i) for i in items],
        meta=PaginationMeta(page=page, per_page=per_page, total=total),
    )


@router.post(
    "",
    response_model=VisitBriefResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create a draft visit brief",
)
async def create_brief(
    body: VisitBriefCreateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisitBriefResponse:
    try:
        brief = await svc.create_brief(
            db=db, user_id=current_user.id, body=body, request=request
        )
    except AppointmentNotFound as exc:
        raise _http_404("APPOINTMENT_NOT_FOUND", str(exc)) from exc
    await db.commit()
    brief, latest = await svc.get_brief(
        db=db, user_id=current_user.id, brief_id=brief.id
    )
    return VisitBriefResponse(data=_hydrate_brief_dto(brief, latest))


@router.get(
    "/{brief_id}",
    response_model=VisitBriefResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get a visit brief",
)
async def get_brief(
    brief_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisitBriefResponse:
    try:
        brief, latest = await svc.get_brief(
            db=db, user_id=current_user.id, brief_id=brief_id
        )
    except BriefNotFound as exc:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="visit_briefs",
            resource_id=str(brief_id),
            http_method="GET",
            route="/visit-briefs/{brief_id}",
        )
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    return VisitBriefResponse(data=_hydrate_brief_dto(brief, latest))


@router.patch(
    "/{brief_id}",
    response_model=VisitBriefResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Update a draft brief (visit_type / title)",
)
async def update_brief(
    brief_id: uuid.UUID,
    body: VisitBriefUpdateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisitBriefResponse:
    try:
        await svc.update_brief(
            db=db, user_id=current_user.id, brief_id=brief_id, body=body
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    await db.commit()
    brief, latest = await svc.get_brief(
        db=db, user_id=current_user.id, brief_id=brief_id
    )
    return VisitBriefResponse(data=_hydrate_brief_dto(brief, latest))


@router.delete(
    "/{brief_id}",
    response_model=VisitBriefResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Archive a brief (soft-delete)",
)
async def archive_brief(
    brief_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisitBriefResponse:
    try:
        await svc.archive_brief(
            db=db, user_id=current_user.id, brief_id=brief_id
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    await db.commit()
    brief, latest = await svc.get_brief(
        db=db, user_id=current_user.id, brief_id=brief_id
    )
    return VisitBriefResponse(data=_hydrate_brief_dto(brief, latest))


# ─────────────────────────────────────────────────────────────────────────────
# Symptoms
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/{brief_id}/symptoms",
    response_model=SymptomEntryResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Add a symptom to a draft brief",
)
async def add_symptom(
    brief_id: uuid.UUID,
    body: SymptomEntryCreateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SymptomEntryResponse:
    try:
        sym, _ = await svc.add_symptom(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            body=body,
            request=request,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    except TooManySymptoms as exc:
        raise _http_400("TOO_MANY_SYMPTOMS", str(exc)) from exc
    await db.commit()
    return SymptomEntryResponse(data=SymptomEntryDTO.model_validate(sym))


@router.patch(
    "/{brief_id}/symptoms/{symptom_id}",
    response_model=SymptomEntryResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Edit a symptom and recompute triage",
)
async def edit_symptom(
    brief_id: uuid.UUID,
    symptom_id: uuid.UUID,
    body: SymptomEntryUpdateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SymptomEntryResponse:
    try:
        sym, _ = await svc.update_symptom(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            symptom_id=symptom_id,
            body=body,
            request=request,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief or symptom not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    await db.commit()
    return SymptomEntryResponse(data=SymptomEntryDTO.model_validate(sym))


@router.delete(
    "/{brief_id}/symptoms/{symptom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Delete a symptom and recompute triage",
)
async def delete_symptom(
    brief_id: uuid.UUID,
    symptom_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await svc.delete_symptom(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            symptom_id=symptom_id,
            request=request,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief or symptom not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Triage on demand + history
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/{brief_id}/route-now",
    response_model=TriageOutcomeResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Recompute the routing outcome for the current brief state",
)
async def route_now(
    brief_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> TriageOutcomeResponse:
    # Review fix M5 — bound triage-recompute spam at 60/hour/user. The endpoint
    # writes one append-only row per call; without a limit a script can fill
    # the table cheaply.
    await _enforce_route_now_rate_limit(redis, current_user.id)
    try:
        outcome = await svc.recompute_triage(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            request=request,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except BriefNotEditable as exc:
        # Review fix L3 — archived briefs can't be re-triaged.
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    await db.commit()
    return TriageOutcomeResponse(data=TriageOutcomeDTO.model_validate(outcome))


@router.get(
    "/{brief_id}/triage-history",
    response_model=TriageOutcomeListResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="List historical triage outcomes for a brief (audit)",
)
async def list_triage_history(
    brief_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TriageOutcomeListResponse:
    try:
        outcomes = await svc.list_triage_history(
            db=db, user_id=current_user.id, brief_id=brief_id
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    return TriageOutcomeListResponse(
        data=[TriageOutcomeDTO.model_validate(o) for o in outcomes]
    )


# ─────────────────────────────────────────────────────────────────────────────
# Questions
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/{brief_id}/questions/suggested",
    response_model=QuestionTemplateListResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Suggested questions for a brief, filtered by visit_type/category",
)
async def list_suggested_questions(
    brief_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    visit_type: Optional[VisitTypeLiteral] = Query(default=None),
    concern_category: Optional[ConcernCategoryLiteral] = Query(default=None),
) -> QuestionTemplateListResponse:
    # Ownership check on the brief (and ensures the suggestion endpoint can't
    # be used as a generic catalog enumerator without a draft).
    try:
        await svc.get_brief(db=db, user_id=current_user.id, brief_id=brief_id)
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    rows = await qb_svc.list_suggestions(
        db=db, visit_type=visit_type, concern_category=concern_category
    )
    return QuestionTemplateListResponse(
        data=[QuestionTemplateDTO.model_validate(r) for r in rows]
    )


@router.patch(
    "/{brief_id}/questions",
    response_model=QuestionSetResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Replace the question set for a draft brief",
)
async def replace_questions(
    brief_id: uuid.UUID,
    body: QuestionSetReplaceBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QuestionSetResponse:
    try:
        qs = await svc.replace_question_set(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            questions=body.questions,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    except TooManyQuestions as exc:
        raise _http_400("TOO_MANY_QUESTIONS", str(exc)) from exc
    await db.commit()
    return QuestionSetResponse(data=QuestionSetDTO.model_validate(qs))


# ─────────────────────────────────────────────────────────────────────────────
# Lifecycle: finalize / attach / detach
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/{brief_id}/finalize",
    response_model=VisitBriefResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Finalize a draft brief (or bump revision on an already-finalized one)",
)
async def finalize_brief(
    brief_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisitBriefResponse:
    try:
        await svc.finalize_brief(
            db=db, user_id=current_user.id, brief_id=brief_id, request=request
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except BriefNotEditable as exc:
        raise _http_409("BRIEF_NOT_EDITABLE", str(exc)) from exc
    except FinalizationRequirementsUnmet as exc:
        raise _http_400("FINALIZE_REQUIREMENTS_UNMET", str(exc)) from exc
    await db.commit()
    brief, latest = await svc.get_brief(
        db=db, user_id=current_user.id, brief_id=brief_id
    )
    return VisitBriefResponse(data=_hydrate_brief_dto(brief, latest))


# ─────────────────────────────────────────────────────────────────────────────
# Stretch P5 — Synchronous PDF download (WeasyPrint)
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/{brief_id}/pdf",
    responses={
        200: {"content": {"application/pdf": {}}},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Download the brief as a PDF (synchronous WeasyPrint render)",
)
async def download_pdf(
    brief_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    locale: str = Query(default="en", pattern="^(en|vi)$"),
) -> Response:
    # Review fix M5 — WeasyPrint is CPU-heavy and synchronous; cap per-user.
    await _enforce_pdf_rate_limit(redis, current_user.id)
    try:
        brief, _ = await svc.get_brief(
            db=db, user_id=current_user.id, brief_id=brief_id
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    try:
        payload = render_pdf(brief, locale=locale)
    except PdfRenderUnavailable as exc:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="PDF_RENDER_UNAVAILABLE",
            message=str(exc),
        ) from exc
    headers = {
        "Content-Disposition": (
            f'attachment; filename="visit-brief-{brief.id}.pdf"'
        ),
        "Cache-Control": "no-store",
    }
    return Response(content=payload, media_type="application/pdf", headers=headers)


@router.post(
    "/{brief_id}/attach",
    response_model=AppointmentBriefLinkResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Attach a brief to an appointment (deactivates other active link)",
)
async def attach(
    brief_id: uuid.UUID,
    body: AttachBriefBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentBriefLinkResponse:
    try:
        link = await svc.attach_to_appointment(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            appointment_id=body.appointment_id,
        )
    except BriefNotFound as exc:
        raise _http_404("BRIEF_NOT_FOUND", "Visit brief not found.") from exc
    except AppointmentNotFound as exc:
        raise _http_404("APPOINTMENT_NOT_FOUND", "Appointment not found.") from exc
    await db.commit()
    return AppointmentBriefLinkResponse(
        data=AppointmentBriefLinkDTO.model_validate(link)
    )


@router.delete(
    "/{brief_id}/attach/{link_id}",
    response_model=AppointmentBriefLinkResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Detach a brief from an appointment",
)
async def detach(
    brief_id: uuid.UUID,
    link_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentBriefLinkResponse:
    try:
        link = await svc.detach_link(
            db=db,
            user_id=current_user.id,
            brief_id=brief_id,
            link_id=link_id,
        )
    except BriefNotFound as exc:
        raise _http_404("LINK_NOT_FOUND", "Brief or link not found.") from exc
    await db.commit()
    return AppointmentBriefLinkResponse(
        data=AppointmentBriefLinkDTO.model_validate(link)
    )
