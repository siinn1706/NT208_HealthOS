"""Visit Brief service layer.

Owns all CRUD + lifecycle (finalize / archive / attach) and is the single
caller of `triage_engine.evaluate`. The engine remains pure-Python; this
module bridges it to the DB and the audit trail.

All public functions take `user_id` and scope every query by it — no
caller-supplied brief id is ever loaded without checking ownership first
(IDOR hardening, matches the existing `appointments` service pattern).

Triage policy:
  * Recomputed synchronously on every symptom change AND on finalize.
  * Inserts a fresh `triage_outcomes` row each time (append-only).
  * If the resulting bucket is `urgent_same_day` or higher, an audit log
    entry is emitted via the existing `audit()` helper. The payload is
    PHI-free: brief id, bucket, ruleset version, signal count.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional, Sequence

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditEventTypeEnum
from app.models.core import (
    Appointment,
    Reminder,
    ReminderRepeatEnum,
    ReminderTypeEnum,
)
from app.models.visit_briefs import (
    AppointmentBriefLink,
    QuestionSet,
    SymptomEntry,
    TriageOutcome,
    VisitBrief,
    VisitBriefStatusEnum,
)
from app.schemas.visit_briefs import (
    QuestionItem,
    SymptomEntryCreateBody,
    SymptomEntryUpdateBody,
    VisitBriefCreateBody,
    VisitBriefUpdateBody,
)
from app.services.audit import audit
from app.services.question_bank import list_canonical, template_to_question_item
from app.services.triage_engine import (
    DISCLAIMER_VERSION,
    SymptomInput,
    TriageInput,
    TriageOutput,
    evaluate,
    severity_of,
)
from app.services.triage_rules import TriageBucketEnum


MAX_SYMPTOMS_PER_BRIEF = 5
MAX_QUESTIONS_PER_SET = 10

# Stretch P6 — auto-create a "Bring your brief" reminder this many hours
# before the appointment when a brief is attached. Set to 0 to disable
# (tests use this; production keeps the default).
PRE_VISIT_REMINDER_LEAD_HOURS = 24

# A stable marker stored in `Reminder.note` so we can dedupe + reverse the
# auto-creation. Loose ("starts-with") match — a user editing the note
# afterwards still has their changes preserved on detach.
_AUTO_REMINDER_MARKER = "[visit-brief-auto]"


# Buckets that warrant an audit-log entry. Anything urgent or above is
# considered noteworthy enough to surface in the security log.
_AUDIT_THRESHOLD = severity_of(TriageBucketEnum.URGENT_SAME_DAY.value)


# ─────────────────────────────────────────────────────────────────────────────
# Custom exceptions — mirror the appointments service convention.
# ─────────────────────────────────────────────────────────────────────────────


class BriefNotFound(LookupError):
    pass


class BriefNotEditable(ValueError):
    """Raised when a finalized / archived brief is mutated."""


class TooManySymptoms(ValueError):
    pass


class TooManyQuestions(ValueError):
    pass


class FinalizationRequirementsUnmet(ValueError):
    """Raised when finalize is called with < 1 symptom or < 1 question."""


class AppointmentNotFound(LookupError):
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _load_owned_brief(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    hydrate: bool = False,
) -> VisitBrief:
    """Load a brief scoped by `user_id`. Raises BriefNotFound if missing."""
    stmt = select(VisitBrief).where(
        VisitBrief.id == brief_id,
        VisitBrief.user_id == user_id,
    )
    if hydrate:
        stmt = stmt.options(
            selectinload(VisitBrief.symptoms),
            selectinload(VisitBrief.question_set),
            selectinload(VisitBrief.appointment_links),
            selectinload(VisitBrief.triage_outcomes),
        )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise BriefNotFound(str(brief_id))
    return row


async def _load_owned_appointment(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
    for_update: bool = False,
) -> Appointment:
    stmt = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.user_id == user_id,
    )
    if for_update:
        stmt = stmt.with_for_update()
    appt = (await db.execute(stmt)).scalar_one_or_none()
    if appt is None:
        raise AppointmentNotFound(str(appointment_id))
    return appt


async def _active_draft_brief_for_appointment(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> Optional[VisitBrief]:
    return (
        await db.execute(
            select(VisitBrief)
            .join(
                AppointmentBriefLink,
                AppointmentBriefLink.visit_brief_id == VisitBrief.id,
            )
            .where(
                VisitBrief.user_id == user_id,
                VisitBrief.status == VisitBriefStatusEnum.DRAFT.value,
                AppointmentBriefLink.appointment_id == appointment_id,
                AppointmentBriefLink.is_active.is_(True),
            )
            .limit(1)
        )
    ).scalar_one_or_none()


def _ensure_editable(brief: VisitBrief) -> None:
    if brief.status != VisitBriefStatusEnum.DRAFT.value:
        raise BriefNotEditable(
            f"Brief is in status {brief.status!r}; only drafts are editable."
        )


def _symptom_entry_to_input(sym: SymptomEntry) -> SymptomInput:
    return SymptomInput(
        concern_text=sym.concern_text,
        concern_category=sym.concern_category,
        severity_0_10=sym.severity_0_10,
        duration_value=sym.duration_value,
        duration_unit=sym.duration_unit,
        onset_date=sym.onset_date,
        triggers=sym.triggers,
        better_with=sym.better_with,
        worse_with=sym.worse_with,
        meds_taken=sym.meds_taken,
        prior_care=sym.prior_care,
        context=sym.context,
    )


async def _latest_triage(  # idor-ok: private helper — brief ownership verified by caller via get_brief(user_id=...)
    db: AsyncSession, brief_id: uuid.UUID
) -> Optional[TriageOutcome]:
    row = await db.execute(
        select(TriageOutcome)
        .where(TriageOutcome.visit_brief_id == brief_id)
        .order_by(TriageOutcome.computed_at.desc())
        .limit(1)
    )
    return row.scalar_one_or_none()


async def _persist_triage(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief: VisitBrief,
    request: Optional[Request] = None,
) -> TriageOutcome:
    """Run the engine over the brief's current symptoms, insert a
    `triage_outcomes` row, and audit if the bucket is urgent or above.
    """
    sym_rows = (
        await db.execute(
            select(SymptomEntry)
            .where(SymptomEntry.visit_brief_id == brief.id)
            .order_by(SymptomEntry.order_index.asc())
        )
    ).scalars().all()
    inputs = TriageInput(
        symptoms=tuple(_symptom_entry_to_input(s) for s in sym_rows),
    )
    out: TriageOutput = evaluate(inputs)

    row = TriageOutcome(
        visit_brief_id=brief.id,
        ruleset_version=out.ruleset_version,
        bucket=out.bucket,
        matched_signals=[m.to_dict() for m in out.matched_signals],
        inputs_snapshot=out.inputs_snapshot,
        inputs_hash=out.inputs_hash,
        disclaimer_version=out.disclaimer_version,
        next_action_copy_key=out.next_action_copy_key,
    )
    db.add(row)
    await db.flush()

    if severity_of(out.bucket) >= _AUDIT_THRESHOLD:
        await audit(
            db=db,
            event_type=AuditEventTypeEnum.VISIT_BRIEF_TRIAGE_COMPUTED,
            user_id=user_id,
            request=request,
            details={
                "brief_id": str(brief.id),
                "bucket": out.bucket,
                "ruleset_version": out.ruleset_version,
                "signal_count": len(out.matched_signals),
            },
        )
    return row


async def _seed_question_set_with_canonicals(
    db: AsyncSession, brief: VisitBrief
) -> QuestionSet:
    """Create a QuestionSet pre-loaded with the four canonical questions."""
    canonicals = await list_canonical(db)
    items = [
        template_to_question_item(c, order=idx, locked=True)
        for idx, c in enumerate(canonicals)
    ]
    qs = QuestionSet(visit_brief_id=brief.id, questions=items)
    db.add(qs)
    await db.flush()
    return qs


# ─────────────────────────────────────────────────────────────────────────────
# Brief CRUD + lifecycle
# ─────────────────────────────────────────────────────────────────────────────


async def list_briefs(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[VisitBrief], int]:
    base = select(VisitBrief).where(VisitBrief.user_id == user_id)
    if status:
        base = base.where(VisitBrief.status == status)
    total = int(
        (
            await db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()
    )
    offset = (page - 1) * per_page
    rows = (
        await db.execute(
            base.order_by(
                VisitBrief.updated_at.desc(),
                VisitBrief.created_at.desc(),
            )
            .offset(offset)
            .limit(per_page)
        )
    ).scalars().all()
    return list(rows), total


async def create_brief(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    body: VisitBriefCreateBody,
    request: Optional[Request] = None,
) -> VisitBrief:
    # Review fix T1 — clone-from-source flow. Load the source brief first
    # (must be owned by the same user) so we can pull visit_type/title from
    # it if the body omits them, copy its symptoms + question_set, and bump
    # `revision`. The source brief is untouched.
    source: Optional[VisitBrief] = None
    if body.clone_from_brief_id is not None:
        source = await _load_owned_brief(
            db,
            user_id=user_id,
            brief_id=body.clone_from_brief_id,
            hydrate=True,
        )

    attach_appointment: Optional[Appointment] = None
    if body.attach_to_appointment_id is not None:
        attach_appointment = await _load_owned_appointment(
            db,
            user_id=user_id,
            appointment_id=body.attach_to_appointment_id,
            for_update=True,
        )
        if source is None:
            existing = await _active_draft_brief_for_appointment(
                db,
                user_id=user_id,
                appointment_id=attach_appointment.id,
            )
            if existing is not None:
                return existing

    brief = VisitBrief(
        user_id=user_id,
        visit_type=body.visit_type if source is None else source.visit_type,
        title=body.title if body.title is not None else (source.title if source else None),
        status=VisitBriefStatusEnum.DRAFT.value,
        revision=(source.revision + 1) if source is not None else 1,
    )
    db.add(brief)
    await db.flush()

    if source is not None:
        # Clone symptoms preserving order. New rows get fresh UUIDs and
        # belong to the new brief.
        for src_sym in source.symptoms:
            db.add(
                SymptomEntry(
                    visit_brief_id=brief.id,
                    concern_text=src_sym.concern_text,
                    concern_category=src_sym.concern_category,
                    onset_date=src_sym.onset_date,
                    duration_value=src_sym.duration_value,
                    duration_unit=src_sym.duration_unit,
                    severity_0_10=src_sym.severity_0_10,
                    triggers=src_sym.triggers,
                    better_with=src_sym.better_with,
                    worse_with=src_sym.worse_with,
                    meds_taken=src_sym.meds_taken,
                    prior_care=src_sym.prior_care,
                    context=src_sym.context,
                    order_index=src_sym.order_index,
                )
            )
        await db.flush()
        # Clone the question set (or seed canonicals if the source had none).
        src_qs = source.question_set
        if src_qs is not None and src_qs.questions:
            db.add(QuestionSet(visit_brief_id=brief.id, questions=list(src_qs.questions)))
            await db.flush()
        else:
            await _seed_question_set_with_canonicals(db, brief)
    else:
        await _seed_question_set_with_canonicals(db, brief)

    # Compute an initial triage outcome so the FE always has one. For a
    # cloned brief this captures the cloned symptoms in the audit trail
    # immediately rather than waiting for the user's first interaction.
    await _persist_triage(db, user_id=user_id, brief=brief, request=request)
    if attach_appointment is not None:
        await attach_to_appointment(
            db=db,
            user_id=user_id,
            brief_id=brief.id,
            appointment_id=attach_appointment.id,
        )
    await db.refresh(brief)
    return brief


async def get_brief(
    db: AsyncSession, *, user_id: uuid.UUID, brief_id: uuid.UUID
) -> tuple[VisitBrief, Optional[TriageOutcome]]:
    brief = await _load_owned_brief(
        db, user_id=user_id, brief_id=brief_id, hydrate=True
    )
    latest = await _latest_triage(db, brief.id)
    return brief, latest


async def update_brief(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    body: VisitBriefUpdateBody,
) -> VisitBrief:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    _ensure_editable(brief)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(brief, key, value)
    await db.flush()
    return brief


async def archive_brief(
    db: AsyncSession, *, user_id: uuid.UUID, brief_id: uuid.UUID
) -> VisitBrief:
    brief = await _load_owned_brief(
        db, user_id=user_id, brief_id=brief_id, hydrate=True
    )
    if brief.status == VisitBriefStatusEnum.ARCHIVED.value:
        return brief
    brief.status = VisitBriefStatusEnum.ARCHIVED.value
    brief.archived_at = datetime.datetime.now(datetime.timezone.utc)
    # Stretch P6 — clean up any auto-created reminders so the user doesn't
    # get pinged about a brief they archived.
    for link in brief.appointment_links:
        if link.is_active:
            await _deactivate_pre_visit_reminder(
                db,
                user_id=user_id,
                brief_id=brief.id,
                appointment_id=link.appointment_id,
            )
    await db.flush()
    return brief


async def finalize_brief(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    request: Optional[Request] = None,
) -> tuple[VisitBrief, TriageOutcome]:
    brief = await _load_owned_brief(
        db, user_id=user_id, brief_id=brief_id, hydrate=True
    )
    if brief.status == VisitBriefStatusEnum.ARCHIVED.value:
        raise BriefNotEditable("Archived briefs cannot be finalized.")
    sym_count = len(brief.symptoms or [])
    qs = brief.question_set
    q_count = len(qs.questions) if qs and qs.questions else 0
    if sym_count == 0 or q_count == 0:
        raise FinalizationRequirementsUnmet(
            "Finalize requires at least one symptom and one question."
        )
    # Re-finalizing creates a new revision row in spirit (revision++) but we
    # keep all history rows in `triage_outcomes`. The brief itself becomes
    # immutable once finalized — drafting a new revision goes through a
    # dedicated "create new revision" flow on the FE.
    if brief.status == VisitBriefStatusEnum.FINALIZED.value:
        brief.revision += 1
    brief.status = VisitBriefStatusEnum.FINALIZED.value
    brief.finalized_at = datetime.datetime.now(datetime.timezone.utc)
    triage = await _persist_triage(
        db, user_id=user_id, brief=brief, request=request
    )
    await db.flush()
    return brief, triage


# ─────────────────────────────────────────────────────────────────────────────
# Symptoms
# ─────────────────────────────────────────────────────────────────────────────


async def add_symptom(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    body: SymptomEntryCreateBody,
    request: Optional[Request] = None,
) -> tuple[SymptomEntry, TriageOutcome]:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    _ensure_editable(brief)
    existing = (
        await db.execute(
            select(func.count())
            .select_from(SymptomEntry)
            .where(SymptomEntry.visit_brief_id == brief_id)
        )
    ).scalar_one()
    if existing >= MAX_SYMPTOMS_PER_BRIEF:
        raise TooManySymptoms(
            f"Briefs are capped at {MAX_SYMPTOMS_PER_BRIEF} symptoms."
        )
    next_order = (
        await db.execute(
            select(func.coalesce(func.max(SymptomEntry.order_index), -1))
            .where(SymptomEntry.visit_brief_id == brief_id)
        )
    ).scalar_one() + 1
    sym = SymptomEntry(
        visit_brief_id=brief.id,
        concern_text=body.concern_text,
        concern_category=body.concern_category,
        onset_date=body.onset_date,
        duration_value=body.duration_value,
        duration_unit=body.duration_unit,
        severity_0_10=body.severity_0_10,
        triggers=body.triggers,
        better_with=body.better_with,
        worse_with=body.worse_with,
        meds_taken=body.meds_taken,
        prior_care=body.prior_care,
        context=body.context,
        order_index=int(next_order),
    )
    db.add(sym)
    await db.flush()
    triage = await _persist_triage(
        db, user_id=user_id, brief=brief, request=request
    )
    await db.refresh(sym)
    return sym, triage


async def update_symptom(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    symptom_id: uuid.UUID,
    body: SymptomEntryUpdateBody,
    request: Optional[Request] = None,
) -> tuple[SymptomEntry, TriageOutcome]:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    _ensure_editable(brief)
    sym = (
        await db.execute(
            select(SymptomEntry).where(
                SymptomEntry.id == symptom_id,
                SymptomEntry.visit_brief_id == brief_id,
            )
        )
    ).scalar_one_or_none()
    if sym is None:
        raise BriefNotFound(str(symptom_id))
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(sym, key, value)
    await db.flush()
    triage = await _persist_triage(
        db, user_id=user_id, brief=brief, request=request
    )
    return sym, triage


async def delete_symptom(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    symptom_id: uuid.UUID,
    request: Optional[Request] = None,
) -> Optional[TriageOutcome]:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    _ensure_editable(brief)
    sym = (
        await db.execute(
            select(SymptomEntry).where(
                SymptomEntry.id == symptom_id,
                SymptomEntry.visit_brief_id == brief_id,
            )
        )
    ).scalar_one_or_none()
    if sym is None:
        raise BriefNotFound(str(symptom_id))
    await db.delete(sym)
    await db.flush()
    triage = await _persist_triage(
        db, user_id=user_id, brief=brief, request=request
    )
    return triage


# ─────────────────────────────────────────────────────────────────────────────
# Triage on demand + history
# ─────────────────────────────────────────────────────────────────────────────


async def recompute_triage(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    request: Optional[Request] = None,
) -> TriageOutcome:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    # Review fix L3: refuse to recompute on archived briefs. The triage_outcomes
    # table is append-only and a script could otherwise spam rows for an
    # archived brief that no FE surface even renders.
    if brief.status == VisitBriefStatusEnum.ARCHIVED.value:
        raise BriefNotEditable(
            "Archived briefs cannot have their triage recomputed."
        )
    return await _persist_triage(
        db, user_id=user_id, brief=brief, request=request
    )


async def list_triage_history(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
) -> list[TriageOutcome]:
    # Ownership check first.
    await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    rows = (
        await db.execute(
            select(TriageOutcome)
            .where(TriageOutcome.visit_brief_id == brief_id)
            .order_by(TriageOutcome.computed_at.desc())
        )
    ).scalars().all()
    return list(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Question set
# ─────────────────────────────────────────────────────────────────────────────


async def replace_question_set(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    questions: Sequence[QuestionItem],
) -> QuestionSet:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    _ensure_editable(brief)
    if len(questions) > MAX_QUESTIONS_PER_SET:
        raise TooManyQuestions(
            f"Briefs are capped at {MAX_QUESTIONS_PER_SET} questions."
        )
    qs = (
        await db.execute(
            select(QuestionSet).where(QuestionSet.visit_brief_id == brief.id)
        )
    ).scalar_one_or_none()
    serialized = [q.model_dump() for q in questions]
    if qs is None:
        qs = QuestionSet(visit_brief_id=brief.id, questions=serialized)
        db.add(qs)
    else:
        qs.questions = serialized
    await db.flush()
    return qs


# ─────────────────────────────────────────────────────────────────────────────
# Appointment links
# ─────────────────────────────────────────────────────────────────────────────


async def attach_to_appointment(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> AppointmentBriefLink:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    appt = await _load_owned_appointment(
        db, user_id=user_id, appointment_id=appointment_id
    )

    # Idempotent: if an active link for this exact pair exists, return it.
    existing = (
        await db.execute(
            select(AppointmentBriefLink).where(
                AppointmentBriefLink.visit_brief_id == brief.id,
                AppointmentBriefLink.appointment_id == appt.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        if not existing.is_active:
            existing.is_active = True
            existing.detached_at = None
            existing.attached_at = datetime.datetime.now(datetime.timezone.utc)
            await _deactivate_other_active_links(
                db, appointment_id=appt.id, keep_link_id=existing.id
            )
            await db.flush()
        # Stretch P6 — even on reactivation, ensure the auto-reminder is in
        # place (it might have been cleaned up while the link was inactive).
        await _ensure_pre_visit_reminder(db, user_id=user_id, brief=brief, appt=appt)
        return existing

    # Deactivate any other active link for the appointment first — only one
    # active brief per appointment (also enforced by the partial unique index).
    await _deactivate_other_active_links(db, appointment_id=appt.id, keep_link_id=None)
    link = AppointmentBriefLink(
        visit_brief_id=brief.id,
        appointment_id=appt.id,
        is_active=True,
    )
    db.add(link)
    await db.flush()

    # Stretch P6 — auto-create the "Bring your brief" reminder. Best-effort:
    # if the lead-time math fails (e.g. appointment in the past) we silently
    # skip rather than failing the whole attach.
    await _ensure_pre_visit_reminder(db, user_id=user_id, brief=brief, appt=appt)
    return link


# ─────────────────────────────────────────────────────────────────────────────
# Stretch P6 — auto-create + clean up the "Bring your brief" reminder
# ─────────────────────────────────────────────────────────────────────────────


def _auto_reminder_note(brief: VisitBrief, appointment_id: uuid.UUID) -> str:
    """Stable note used to dedupe and reverse-lookup the auto-created reminder."""
    return f"{_AUTO_REMINDER_MARKER} brief={brief.id} appt={appointment_id}"


async def _ensure_pre_visit_reminder(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief: VisitBrief,
    appt: Appointment,
) -> Optional[Reminder]:
    """Create a one-time reminder N hours before the appointment if missing.

    Idempotent: looks up an existing reminder by `_auto_reminder_note` first.
    Returns the reminder row (existing or freshly created) or `None` if the
    reminder couldn't be scheduled (lead time crosses past, feature disabled).
    """
    if PRE_VISIT_REMINDER_LEAD_HOURS <= 0:
        return None
    fire_at = appt.appointment_date - datetime.timedelta(
        hours=PRE_VISIT_REMINDER_LEAD_HOURS
    )
    if fire_at <= datetime.datetime.now(datetime.timezone.utc):
        # Appointment is too soon — nothing to schedule. Silent no-op so the
        # attach flow doesn't fail just because the user is rushing.
        return None

    note = _auto_reminder_note(brief, appt.id)
    existing = (
        await db.execute(
            select(Reminder).where(
                Reminder.user_id == user_id,
                Reminder.note == note,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        # Already scheduled — keep idempotent.
        return existing

    title = "Bring your visit brief"
    if appt.doctor_name:
        title = f"Bring your visit brief — {appt.doctor_name}"

    # Review fix M7: explicitly write the reminder in UTC so the existing
    # reminder beat (which interprets `time_of_day` against the row's `tzid`)
    # fires at the absolute moment we computed. Previously the row defaulted
    # to `tzid="Asia/Ho_Chi_Minh"` while `time_of_day` was UTC time-of-day,
    # which mis-fired by the local-UTC offset.
    fire_at_utc = fire_at.astimezone(datetime.timezone.utc)
    reminder = Reminder(
        user_id=user_id,
        type=ReminderTypeEnum.APPOINTMENT,
        title=title,
        remind_time=fire_at_utc.strftime("%H:%M"),
        repeat=ReminderRepeatEnum.ONCE,
        note=note,
        tzid="UTC",
        time_of_day=fire_at_utc.time(),
        start_date=fire_at_utc.date(),
        end_date=fire_at_utc.date(),
        next_occurrence_at=fire_at_utc,
        is_active=True,
    )
    db.add(reminder)
    await db.flush()
    return reminder


async def _deactivate_pre_visit_reminder(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    appointment_id: uuid.UUID,
) -> None:
    """Mark the auto-created reminder inactive when its brief is detached
    or archived. We do NOT delete the row — keeping it visible (as 'done')
    in the user's reminder history is friendlier than silently disappearing
    a reminder they may have already received.
    """
    note = f"{_AUTO_REMINDER_MARKER} brief={brief_id} appt={appointment_id}"
    rem = (
        await db.execute(
            select(Reminder).where(
                Reminder.user_id == user_id,
                Reminder.note == note,
            )
        )
    ).scalar_one_or_none()
    if rem is None:
        return
    rem.is_active = False
    rem.done = True
    await db.flush()


async def _deactivate_other_active_links(  # idor-ok: operates on appointment_id already verified by caller; deactivates only previously-owned links
    db: AsyncSession,
    *,
    appointment_id: uuid.UUID,
    keep_link_id: Optional[uuid.UUID],
) -> None:
    others = (
        await db.execute(
            select(AppointmentBriefLink).where(
                AppointmentBriefLink.appointment_id == appointment_id,
                AppointmentBriefLink.is_active.is_(True),
            )
        )
    ).scalars().all()
    now = datetime.datetime.now(datetime.timezone.utc)
    for link in others:
        if keep_link_id is not None and link.id == keep_link_id:
            continue
        link.is_active = False
        link.detached_at = now
    await db.flush()


async def detach_link(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    brief_id: uuid.UUID,
    link_id: uuid.UUID,
) -> AppointmentBriefLink:
    brief = await _load_owned_brief(db, user_id=user_id, brief_id=brief_id)
    link = (
        await db.execute(
            select(AppointmentBriefLink).where(
                AppointmentBriefLink.id == link_id,
                AppointmentBriefLink.visit_brief_id == brief.id,
            )
        )
    ).scalar_one_or_none()
    if link is None:
        raise BriefNotFound(str(link_id))
    if link.is_active:
        link.is_active = False
        link.detached_at = datetime.datetime.now(datetime.timezone.utc)
        # Stretch P6 — clean up the auto-created reminder so the user
        # doesn't receive a "bring your brief" nudge for a detached pairing.
        await _deactivate_pre_visit_reminder(
            db,
            user_id=user_id,
            brief_id=brief.id,
            appointment_id=link.appointment_id,
        )
        await db.flush()
    return link
