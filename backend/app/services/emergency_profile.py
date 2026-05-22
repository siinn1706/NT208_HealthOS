"""Emergency Health Card service layer.

All read/write paths for the feature live here so the endpoints stay thin.

Public surface:

  * `derive_card(user, profile, medication_plans, emergency_profile)` →
    returns `(PublicEmergencyCardDTO, fields_returned)`. The contract is
    hard-coded: adding a field requires updating the DTO + the blocklist test.

  * `compute_completeness(card, has_emergency_contact)` → returns
    `(score, missing_critical_fields, nudges)`.

  * `mint_token(db, user, label)` → creates a hash-stored token row, returns
    `(EmergencyShareToken, plaintext_token, share_url)`. Plaintext is shown
    once and never persisted.

  * `lookup_active_token(db, plaintext)` → for the public route. Returns
    `None` when missing / revoked / expired so the caller can map all
    failure modes to a single `410 Gone`.

  * `log_access(db, token, request)` → append-only log row + counter update.

  * `revoke_token(db, user_id, token_id)` → idempotent revocation.

  * `get_owner_view(db, user)` → composes the dashboard payload.

The token format follows the OTP / session pattern in this repo:
  * Plaintext = `secrets.token_urlsafe(32)` — 256 bits of entropy.
  * Storage  = SHA-256(plaintext) hex; raw token never persisted.
"""
from __future__ import annotations

import datetime
import hashlib
import ipaddress
import logging
import re
import secrets
import uuid
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.core import User, UserProfile
from app.models.emergency import (
    AssistanceNeedEnum,
    EmergencyAccessLog,
    EmergencyCardFieldEnum,
    EmergencyProfile,
    EmergencyShareToken,
)

# `MedicationPlan` is the authoritative source for active medications when
# the Medication Hub feature (migration 025) is fully merged. The current
# codebase has the migration + schemas + endpoints + service-layer
# references, but the ORM model itself is in flight in `core.py`. We import
# defensively so the emergency card still works against the legacy free-text
# fallback (`medical_info.current_medications`) until the ORM model lands.
try:
    from app.models.core import MedicationPlan  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover — defensive import
    MedicationPlan = None  # type: ignore[assignment, misc]
from dataclasses import dataclass

from app.schemas.emergency import (
    CompletenessNudge,
    EmergencyAccessLogDTO,
    EmergencyProfileOwnerView,
    EmergencyShareTokenDTO,
    PublicEmergencyCardDTO,
    PublicEmergencyContact,
    PublicEmergencyMedication,
)
from app.services.qr_render import render_qr_data_url


@dataclass(frozen=True)
class MintPreflight:
    """Lightweight summary used by the mint endpoint before any render or
    insert work. M4 — extracted from `get_owner_view` so the mint hot path
    doesn't pay for the tokens list + access logs query it doesn't need.
    """

    is_published: bool
    completeness_score: int
    max_active_tokens: int
    missing_critical_fields: list[str]
    preferred_language: Optional[str]
    card: PublicEmergencyCardDTO

logger = logging.getLogger(__name__)


# ─── Constants ───────────────────────────────────────────────────────────────

MAX_ACTIVE_TOKENS_PER_USER = 5
MAX_EMERGENCY_CONTACTS_ON_CARD = 3
COMPLETENESS_PUBLISH_THRESHOLD = 30
# Per-token sanity cap — endpoint flags the token (and notifies the owner)
# once cumulative reads exceed this. Helps catch leaked-token scrapers
# without hard-revoking on the off chance the user is genuinely a heavy user.
TOKEN_SANITY_CAP_READS = 10_000


class TokenNotFound(Exception):
    """Raised by revoke_token when the (user_id, token_id) pair doesn't exist."""


class TooManyActiveTokens(Exception):
    """Raised by mint_token when the user already has the maximum active tokens."""


class CardNotPublished(Exception):
    """Raised by mint_token when the user has not opted-in to publishing."""


class InsufficientProfile(Exception):
    """Raised by mint_token when the derived card is below the publish threshold
    and the caller did not pass `acknowledge_low_completeness=True`.
    """


# ─── Helpers ─────────────────────────────────────────────────────────────────


def hash_token(plaintext: str) -> str:
    """SHA-256 hex of the plaintext token. Used for both write and lookup."""
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def _generate_token() -> str:
    """256-bit URL-safe token. ~43 chars. Never re-used, never re-issued."""
    return secrets.token_urlsafe(32)


_SPLIT_RX = re.compile(r"[,\n;]+")


def _split_free_text(value: Optional[str]) -> list[str]:
    """Split free-text allergies / conditions into a clean bullet list.

    Trims whitespace, drops empty entries, deduplicates while preserving
    insertion order. Cap at 12 items to keep the printed card readable.
    """
    if not value:
        return []
    parts = [p.strip() for p in _SPLIT_RX.split(value)]
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        if not p:
            continue
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out[:12]


def _compute_age(dob: Optional[datetime.date]) -> Optional[int]:
    """Compute integer age in years from DOB. Returns None if DOB missing.

    M5 — uses UTC to avoid a server-local-clock dependency. Off-by-one
    near midnight in user-local time is acceptable for an emergency card
    (and unavoidable without per-user timezone resolution).
    """
    if dob is None:
        return None
    today = datetime.datetime.now(datetime.timezone.utc).date()
    years = today.year - dob.year - (
        (today.month, today.day) < (dob.month, dob.day)
    )
    return max(0, years)


def truncate_ip(ip: Optional[str]) -> Optional[str]:
    """IPv4 → /24, IPv6 → /64. Returns None if the input is unparseable.

    We never persist the full IP — even in the audit log. The /24 / /64
    granularity is enough to detect "same responder phone" without
    geolocating individuals.
    """
    if not ip:
        return None
    raw = ip.strip()
    # Strip brackets from IPv6 like `[::1]` or `[::1]:54321`.
    if raw.startswith("[") and "]" in raw:
        raw = raw[1: raw.index("]")]
    # Strip an IPv4 port suffix `1.2.3.4:5678`.
    if raw.count(":") == 1 and raw.split(":")[0].count(".") == 3:
        raw = raw.split(":", 1)[0]
    try:
        addr = ipaddress.ip_address(raw)
    except ValueError:
        return None
    if isinstance(addr, ipaddress.IPv4Address):
        return str(ipaddress.ip_network(f"{addr}/24", strict=False))
    return str(ipaddress.ip_network(f"{addr}/64", strict=False))


def _client_ip_from_request(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _user_agent_from_request(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    ua = request.headers.get("user-agent")
    if ua is None:
        return None
    return ua[:512]


# ─── Derivation ──────────────────────────────────────────────────────────────


def _is_visible(visibility: dict[str, Any], field: EmergencyCardFieldEnum) -> bool:
    """Field visibility default: visible. Explicit `false` hides the field.

    Unknown keys (e.g., a future field on an old row) default to visible —
    forward-compatible.
    """
    raw = visibility.get(field.value, True)
    return bool(raw)


def derive_card(
    *,
    user: User,
    profile: Optional[UserProfile],
    medication_plans: list[Any],
    emergency_profile: Optional[EmergencyProfile],
) -> tuple[PublicEmergencyCardDTO, dict[str, bool]]:
    """Build the public-card DTO from the source data + visibility overrides.

    `fields_returned` is a small bool map used by the access-log row to
    record which sections actually shipped in this response. The map is
    bounded to known fields so it doesn't bloat over time.
    """
    visibility: dict[str, Any] = (
        emergency_profile.field_visibility if emergency_profile is not None else {}
    ) or {}
    nkda_confirmed = bool(emergency_profile.nkda_confirmed) if emergency_profile else False

    medical_info: dict[str, Any] = (
        profile.medical_info if profile is not None and profile.medical_info else {}
    )
    raw_emergency_contacts: list[dict[str, Any]] = (
        profile.emergency_contacts
        if profile is not None and profile.emergency_contacts
        else []
    )

    fields_returned: dict[str, bool] = {}

    # Identity — name is always shown (responders need to confirm patient).
    full_name = (profile.full_name if profile and profile.full_name else None) or user.display_name
    fields_returned["name"] = bool(full_name)

    age_value: Optional[int] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.AGE):
        age_value = _compute_age(profile.date_of_birth if profile else None)
    fields_returned[EmergencyCardFieldEnum.AGE.value] = age_value is not None

    gender_value: Optional[str] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.GENDER):
        if profile and profile.gender is not None:
            gender_value = getattr(profile.gender, "value", profile.gender)
    fields_returned[EmergencyCardFieldEnum.GENDER.value] = gender_value is not None

    preferred_language: Optional[str] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.PREFERRED_LANGUAGE):
        preferred_language = (
            emergency_profile.preferred_language if emergency_profile else None
        )
    fields_returned[EmergencyCardFieldEnum.PREFERRED_LANGUAGE.value] = (
        preferred_language is not None
    )

    blood_type: Optional[str] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.BLOOD_TYPE):
        blood_type = profile.blood_type if profile else None
    fields_returned[EmergencyCardFieldEnum.BLOOD_TYPE.value] = blood_type is not None

    allergies: list[str] = []
    show_allergies = _is_visible(visibility, EmergencyCardFieldEnum.ALLERGIES)
    if show_allergies:
        allergies = _split_free_text(medical_info.get("allergies"))
    fields_returned[EmergencyCardFieldEnum.ALLERGIES.value] = bool(allergies) or (
        show_allergies and nkda_confirmed
    )

    chronic_conditions: list[str] = []
    if _is_visible(visibility, EmergencyCardFieldEnum.CONDITIONS):
        chronic_conditions = _split_free_text(medical_info.get("chronic_conditions"))
    fields_returned[EmergencyCardFieldEnum.CONDITIONS.value] = bool(chronic_conditions)

    medications: list[PublicEmergencyMedication] = []
    if _is_visible(visibility, EmergencyCardFieldEnum.MEDICATIONS):
        active_plans = [p for p in medication_plans if p.status == "active"]
        if active_plans:
            for plan in active_plans:
                medications.append(
                    PublicEmergencyMedication(
                        name=plan.name,
                        # Only `strength` is shipped — never schedule, prescriber,
                        # clinic, dose times, or refill data.
                        strength=plan.strength,
                    )
                )
        else:
            # Legacy free-text fallback. Each non-empty bullet becomes a
            # nameless medication entry so the FE renders it consistently.
            for bullet in _split_free_text(medical_info.get("current_medications")):
                medications.append(PublicEmergencyMedication(name=bullet))
    fields_returned[EmergencyCardFieldEnum.MEDICATIONS.value] = bool(medications)

    emergency_contacts: list[PublicEmergencyContact] = []
    if _is_visible(visibility, EmergencyCardFieldEnum.CONTACTS):
        for ec in raw_emergency_contacts[:MAX_EMERGENCY_CONTACTS_ON_CARD]:
            name = (ec.get("name") or "").strip() if isinstance(ec, dict) else ""
            phone = (ec.get("phone") or "").strip() if isinstance(ec, dict) else ""
            if not name or not phone:
                continue
            emergency_contacts.append(
                PublicEmergencyContact(
                    name=name,
                    relationship=(ec.get("relationship") or None),
                    phone=phone,
                )
            )
    fields_returned[EmergencyCardFieldEnum.CONTACTS.value] = bool(emergency_contacts)

    assistance_needed: list[str] = []
    if _is_visible(visibility, EmergencyCardFieldEnum.ASSISTANCE) and emergency_profile:
        raw_assistance = emergency_profile.assistance_needed or []
        valid_values = {item.value for item in AssistanceNeedEnum}
        assistance_needed = [a for a in raw_assistance if a in valid_values]
    fields_returned[EmergencyCardFieldEnum.ASSISTANCE.value] = bool(assistance_needed)

    equipment_notes: Optional[str] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.EQUIPMENT) and emergency_profile:
        equipment_notes = emergency_profile.equipment_notes
    fields_returned[EmergencyCardFieldEnum.EQUIPMENT.value] = bool(equipment_notes)

    communication_notes: Optional[str] = None
    if _is_visible(visibility, EmergencyCardFieldEnum.COMMUNICATION) and emergency_profile:
        communication_notes = emergency_profile.communication_notes
    fields_returned[EmergencyCardFieldEnum.COMMUNICATION.value] = bool(communication_notes)

    # L2 — pick the most recent of (emergency_profile.updated_at,
    # profile.updated_at). Both columns may be missing on legacy rows;
    # we use `getattr` rather than the prior confusing `.user is not None`
    # predicate which had nothing to do with timestamp freshness.
    last_updated_at: Optional[datetime.datetime] = None
    if emergency_profile is not None:
        last_updated_at = emergency_profile.updated_at or emergency_profile.created_at
    profile_updated = getattr(profile, "updated_at", None) if profile else None
    if profile_updated and (last_updated_at is None or profile_updated > last_updated_at):
        last_updated_at = profile_updated

    dto = PublicEmergencyCardDTO(
        full_name=full_name,
        age_years=age_value,
        gender=gender_value,  # type: ignore[arg-type]
        preferred_language=preferred_language,
        blood_type=blood_type,
        nkda_confirmed=nkda_confirmed and show_allergies,
        allergies=allergies,
        chronic_conditions=chronic_conditions,
        medications=medications,
        assistance_needed=assistance_needed,  # type: ignore[arg-type]
        equipment_notes=equipment_notes,
        communication_notes=communication_notes,
        emergency_contacts=emergency_contacts,
        last_updated_at=last_updated_at,
    )
    return dto, fields_returned


# ─── Completeness gate ───────────────────────────────────────────────────────


def compute_completeness(
    card: PublicEmergencyCardDTO,
    *,
    has_emergency_contact: bool,
) -> tuple[int, list[str], list[CompletenessNudge]]:
    """Score 0..100 + the list of fields that block "publish-ready" status.

    Critical fields (each missing one drops score by ~25 and surfaces a red
    nudge): emergency_contact, blood_type, allergies-or-NKDA.

    Recommended fields (each missing one drops score by ~10): chronic
    conditions, medications, assistance/equipment notes.

    Score is clamped to [0, 100].
    """
    nudges: list[CompletenessNudge] = []
    missing_critical: list[str] = []
    score = 100

    def critical(field: str, message_key: str, fix_path: str) -> None:
        nonlocal score
        score -= 25
        missing_critical.append(field)
        nudges.append(
            CompletenessNudge(
                field=field,
                level="critical",
                message_key=message_key,
                fix_path=fix_path,
            )
        )

    def recommended(field: str, message_key: str, fix_path: str) -> None:
        nonlocal score
        score -= 10
        nudges.append(
            CompletenessNudge(
                field=field,
                level="recommended",
                message_key=message_key,
                fix_path=fix_path,
            )
        )

    if not has_emergency_contact or not card.emergency_contacts:
        critical(
            "emergency_contacts",
            "missingEmergencyContacts",
            "/dashboard/profile?focus=emergency_contacts",
        )
    if not card.blood_type:
        critical(
            "blood_type",
            "missingBloodType",
            "/dashboard/profile?focus=blood_type",
        )
    if not card.allergies and not card.nkda_confirmed:
        critical(
            "allergies",
            "missingAllergies",
            "/dashboard/emergency-card?tab=edit&focus=allergies",
        )
    if not card.chronic_conditions:
        recommended(
            "chronic_conditions",
            "missingConditions",
            "/dashboard/profile?focus=chronic_conditions",
        )
    if not card.medications:
        recommended(
            "medications",
            "missingMedications",
            "/dashboard/profile?focus=current_medications",
        )

    return max(0, min(100, score)), missing_critical, nudges


# ─── Profile row ─────────────────────────────────────────────────────────────


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> Optional[EmergencyProfile]:
    result = await db.execute(
        select(EmergencyProfile).where(EmergencyProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_or_create_profile(db: AsyncSession, user_id: uuid.UUID) -> EmergencyProfile:
    existing = await get_profile(db, user_id)
    if existing is not None:
        return existing
    row = EmergencyProfile(user_id=user_id)
    db.add(row)
    await db.flush()
    return row


# ─── Tokens ──────────────────────────────────────────────────────────────────


def _is_active(token: EmergencyShareToken) -> bool:
    """A token is active iff it is not revoked and not past its expiry."""
    if token.revoked_at is not None:
        return False
    if token.expires_at is not None:
        if token.expires_at <= datetime.datetime.now(datetime.timezone.utc):
            return False
    return True


def _build_share_url(plaintext_token: str) -> str:
    base = settings.app_url.rstrip("/")
    return f"{base}/e/{plaintext_token}"


async def list_tokens(
    db: AsyncSession, user_id: uuid.UUID
) -> list[EmergencyShareToken]:
    """All tokens (active + revoked) for the owner manager UI, newest first."""
    result = await db.execute(
        select(EmergencyShareToken)
        .where(EmergencyShareToken.user_id == user_id)
        .order_by(EmergencyShareToken.created_at.desc())
    )
    return list(result.scalars().all())


async def count_active_tokens(db: AsyncSession, user_id: uuid.UUID) -> int:
    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(func.count(EmergencyShareToken.id)).where(
            EmergencyShareToken.user_id == user_id,
            EmergencyShareToken.revoked_at.is_(None),
            (
                EmergencyShareToken.expires_at.is_(None)
                | (EmergencyShareToken.expires_at > now)
            ),
        )
    )
    return int(result.scalar_one() or 0)


def prepare_token_secret() -> tuple[str, str, str]:
    """Pure function — generate `(plaintext, digest, share_url)` without any DB.

    H5 — split out from `mint_token` so the endpoint can render the QR + PDF
    BEFORE the DB write. If render fails, no token row is ever inserted,
    avoiding orphan tokens on render-failure retries.
    """
    plaintext = _generate_token()
    digest = hash_token(plaintext)
    share_url = _build_share_url(plaintext)
    return plaintext, digest, share_url


async def mint_token(
    db: AsyncSession,
    *,
    user: User,
    label: str,
    digest: str,
    completeness_score: int,
    is_published: bool,
    acknowledge_low_completeness: bool = False,
) -> EmergencyShareToken:
    """Insert a pre-prepared share token. Caller must have already rendered
    the QR / wallet PDF (see `prepare_token_secret` + `render_qr_data_url`).

    Caller must call `db.commit()` (we only `flush()` to surface DB errors
    inside the transaction). The endpoint composes the final response.

    H3 — TOCTOU fix: we acquire a `SELECT … FOR UPDATE` lock on the owner's
    `users` row before counting active tokens, so two concurrent mints from
    the same owner serialize and the cap is enforced exactly. Matches the
    row-lock pattern used by the avatar/profile updates in `users.py`.
    """
    if not is_published:
        raise CardNotPublished()
    if (
        completeness_score < COMPLETENESS_PUBLISH_THRESHOLD
        and not acknowledge_low_completeness
    ):
        raise InsufficientProfile()

    # Serialize concurrent mints from the same owner. The SELECT … FOR UPDATE
    # holds the row lock until the enclosing transaction commits, so the
    # subsequent count + insert are effectively atomic from the cap's
    # perspective. Cross-owner mints are not blocked.
    await db.execute(
        select(User.id).where(User.id == user.id).with_for_update()
    )

    if await count_active_tokens(db, user.id) >= MAX_ACTIVE_TOKENS_PER_USER:
        raise TooManyActiveTokens()

    row = EmergencyShareToken(
        user_id=user.id,
        label=label.strip()[:64],
        token_hash=digest,
    )
    db.add(row)
    await db.flush()
    return row


async def revoke_token(
    db: AsyncSession, *, user_id: uuid.UUID, token_id: uuid.UUID
) -> EmergencyShareToken:
    """Mark a token revoked. Idempotent — re-revoking is a no-op."""
    result = await db.execute(
        select(EmergencyShareToken).where(
            EmergencyShareToken.id == token_id,
            EmergencyShareToken.user_id == user_id,
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise TokenNotFound()
    if token.revoked_at is None:
        token.revoked_at = datetime.datetime.now(datetime.timezone.utc)
        await db.flush()
    return token


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Mass-revoke. Used by the soft-delete cascade and the "Revoke all" CTA.

    Returns the number of rows newly revoked.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        update(EmergencyShareToken)
        .where(
            EmergencyShareToken.user_id == user_id,
            EmergencyShareToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
        .returning(EmergencyShareToken.id)
    )
    rows = result.fetchall()
    return len(rows)


# ─── Public lookup ───────────────────────────────────────────────────────────


async def lookup_active_token(
    db: AsyncSession, *, plaintext_token: str
) -> Optional[EmergencyShareToken]:
    """Find a token by its plaintext value if it is currently active.

    Returns `None` for: missing, revoked, expired. The endpoint maps every
    failure mode to a single `410 Gone` so an attacker cannot distinguish
    "token never existed" from "token revoked yesterday".

    `eager-loads` no relationships — the endpoint queries the user / profile
    / medication_plans separately so we can early-return on soft-delete.
    """
    # L7 — `secrets.token_urlsafe(32)` always yields exactly 43 chars.
    # Anything outside [32, 64] is obviously a bad token; reject before
    # paying for the SHA-256 + DB lookup. The buffer (32..64) absorbs any
    # future entropy bump (e.g., switch to token_urlsafe(40) = 54 chars).
    if not plaintext_token or len(plaintext_token) < 32 or len(plaintext_token) > 64:
        return None
    digest = hash_token(plaintext_token)
    result = await db.execute(
        select(EmergencyShareToken).where(EmergencyShareToken.token_hash == digest)
    )
    token = result.scalar_one_or_none()
    if token is None or not _is_active(token):
        return None
    return token


async def load_card_source_data(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[Optional[User], Optional[UserProfile], list[Any], Optional[EmergencyProfile]]:
    """One-shot loader of everything needed to derive a card.

    Returns `(user, profile, medication_plans, emergency_profile)`. Caller
    treats `user is None` as "user purged" → 410. Medication plans are
    queried only when the ORM model is available (migration 025 + model
    landed); otherwise the derivation falls back to the legacy free-text
    `medical_info.current_medications`.
    """
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        return None, None, [], None

    if getattr(user, "deleted_at", None) is not None:
        return None, None, [], None

    profile = user.profile

    plans: list[Any] = []
    if MedicationPlan is not None:
        try:
            plans_result = await db.execute(
                select(MedicationPlan)
                .where(
                    MedicationPlan.user_id == user_id,
                    MedicationPlan.status == "active",
                )
                .order_by(MedicationPlan.name)
            )
            plans = list(plans_result.scalars().all())
        except Exception:  # pragma: no cover — table or model out of sync
            logger.exception("Failed to query medication_plans; falling back to medical_info")
            plans = []

    emergency_profile = await get_profile(db, user_id)
    return user, profile, plans, emergency_profile


# ─── Access logging ──────────────────────────────────────────────────────────


async def log_access(
    db: AsyncSession,
    *,
    token: EmergencyShareToken,
    request: Optional[Request],
    fields_returned: dict[str, bool],
) -> tuple[EmergencyAccessLog, bool]:
    """Append an access-log row + bump counters on the token.

    Returns `(log_row, is_first_seen_in_24h)`. The endpoint uses the second
    value to decide whether to additionally write a security audit-log row
    (we don't audit every single hit — only the first per (token, ip/24)
    in any 24-hour window).
    """
    raw_ip = _client_ip_from_request(request)
    ip_truncated = truncate_ip(raw_ip)
    user_agent = _user_agent_from_request(request)
    now = datetime.datetime.now(datetime.timezone.utc)

    is_first = await _is_first_in_window(
        db, token_id=token.id, ip_truncated=ip_truncated, now=now
    )

    row = EmergencyAccessLog(
        token_id=token.id,
        user_id=token.user_id,
        ip_truncated=ip_truncated,
        user_agent=user_agent,
        fields_returned=fields_returned,
    )
    db.add(row)

    token.access_count = (token.access_count or 0) + 1
    token.last_accessed_at = now
    await db.flush()
    return row, is_first


async def _is_first_in_window(  # idor-ok: operates on token_id (not user-scoped) — token ownership verified by caller
    db: AsyncSession,
    *,
    token_id: uuid.UUID,
    ip_truncated: Optional[str],
    now: datetime.datetime,
) -> bool:
    """True iff no prior access log row exists for the same (token, ip/24)
    within the last 24 hours.

    Used to keep the security audit log sparse — only the *first* access from
    a new IP segment per token-per-day is audited. Frequent re-scans by the
    same paramedic phone do not flood the audit table.
    """
    cutoff = now - datetime.timedelta(hours=24)
    stmt = select(EmergencyAccessLog.id).where(
        EmergencyAccessLog.token_id == token_id,
        EmergencyAccessLog.accessed_at >= cutoff,
    )
    if ip_truncated is None:
        stmt = stmt.where(EmergencyAccessLog.ip_truncated.is_(None))
    else:
        stmt = stmt.where(EmergencyAccessLog.ip_truncated == ip_truncated)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none() is None


async def list_access_logs(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    limit: int = 50,
    token_id: Optional[uuid.UUID] = None,
) -> list[EmergencyAccessLog]:
    stmt = (
        select(EmergencyAccessLog)
        .where(EmergencyAccessLog.user_id == user_id)
        .order_by(EmergencyAccessLog.accessed_at.desc())
        .limit(min(max(1, limit), 200))
    )
    if token_id is not None:
        stmt = stmt.where(EmergencyAccessLog.token_id == token_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ─── Owner view composition ──────────────────────────────────────────────────


def _has_emergency_contact(profile: Optional[UserProfile]) -> bool:
    if profile is None or not profile.emergency_contacts:
        return False
    for ec in profile.emergency_contacts:
        if not isinstance(ec, dict):
            continue
        name = (ec.get("name") or "").strip()
        phone = (ec.get("phone") or "").strip()
        if name and phone:
            return True
    return False


def _to_token_dto(token: EmergencyShareToken) -> EmergencyShareTokenDTO:
    return EmergencyShareTokenDTO(
        id=token.id,
        label=token.label,
        created_at=token.created_at,
        revoked_at=token.revoked_at,
        expires_at=token.expires_at,
        last_accessed_at=token.last_accessed_at,
        access_count=token.access_count or 0,
        is_active=_is_active(token),
    )


async def mint_preflight(db: AsyncSession, *, user: User) -> MintPreflight:
    """Cheap pre-mint check — derives the card and runs completeness scoring
    without touching the tokens table or access logs.

    M4 — replaces the prior `get_owner_view()` call from the mint endpoint
    (which pulled in tokens + access logs that the mint flow doesn't need).
    """
    user_, profile, plans, emergency_profile = await load_card_source_data(db, user.id)
    source_user = user_ or user
    card, _fields = derive_card(
        user=source_user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=emergency_profile,
    )
    score, missing, _nudges = compute_completeness(
        card, has_emergency_contact=_has_emergency_contact(profile)
    )
    return MintPreflight(
        is_published=bool(emergency_profile.is_published) if emergency_profile else False,
        completeness_score=score,
        max_active_tokens=MAX_ACTIVE_TOKENS_PER_USER,
        missing_critical_fields=missing,
        preferred_language=emergency_profile.preferred_language if emergency_profile else None,
        card=card,
    )


async def get_owner_view(
    db: AsyncSession, *, user: User
) -> EmergencyProfileOwnerView:
    """Compose the dashboard payload — preview + nudges + tokens summary."""
    user_, profile, plans, emergency_profile = await load_card_source_data(db, user.id)
    # `user_` is just a fresh ORM handle; we already have the authenticated
    # `user` so use whichever has the loaded `.profile` relationship.
    source_user = user_ or user

    card, _fields = derive_card(
        user=source_user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=emergency_profile,
    )
    score, missing, nudges = compute_completeness(
        card, has_emergency_contact=_has_emergency_contact(profile)
    )
    tokens = await list_tokens(db, user.id)
    active_count = sum(1 for t in tokens if _is_active(t))

    return EmergencyProfileOwnerView(
        is_published=bool(emergency_profile.is_published) if emergency_profile else False,
        assistance_needed=(emergency_profile.assistance_needed or []) if emergency_profile else [],  # type: ignore[arg-type]
        equipment_notes=emergency_profile.equipment_notes if emergency_profile else None,
        communication_notes=emergency_profile.communication_notes if emergency_profile else None,
        field_visibility=emergency_profile.field_visibility if emergency_profile else {},
        nkda_confirmed=bool(emergency_profile.nkda_confirmed) if emergency_profile else False,
        preferred_language=emergency_profile.preferred_language if emergency_profile else None,
        last_published_at=emergency_profile.last_published_at if emergency_profile else None,
        card=card,
        completeness_score=score,
        missing_critical_fields=missing,
        nudges=nudges,
        tokens=[_to_token_dto(t) for t in tokens],
        active_token_count=active_count,
        max_active_tokens=MAX_ACTIVE_TOKENS_PER_USER,
    )


# ─── DTO converters (re-exported for endpoint readability) ───────────────────


def to_token_dto(token: EmergencyShareToken) -> EmergencyShareTokenDTO:
    return _to_token_dto(token)


def to_access_log_dto(row: EmergencyAccessLog) -> EmergencyAccessLogDTO:
    return EmergencyAccessLogDTO(
        id=row.id,
        token_id=row.token_id,
        ip_truncated=row.ip_truncated,
        user_agent=row.user_agent,
        accessed_at=row.accessed_at,
    )


def build_share_url_for_token(plaintext_token: str) -> str:
    return _build_share_url(plaintext_token)


def render_qr_for_share_url(share_url: str) -> str:
    """Render the QR for a given share URL. Pure function, no DB.

    Kept separate from `prepare_token_secret` so the endpoint can render
    BEFORE the DB insert (H5 atomicity fix).
    """
    return render_qr_data_url(share_url)


def render_qr_for_token(plaintext_token: str) -> str:
    """Convenience wrapper kept for backward compatibility."""
    return render_qr_data_url(_build_share_url(plaintext_token))
