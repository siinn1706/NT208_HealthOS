"""Pydantic schemas for the Emergency Health Card feature.

The DTO design enforces the privacy contract from the plan §3:

  * `PublicEmergencyCardDTO` is the wire format for the unauthenticated
    `/v1/public/emergency/{token}` route. It deliberately omits email,
    raw DOB, address, avatar, dose schedules, prescriber, etc. New owner-side
    fields cannot accidentally leak — they would have to be added here too.

  * `EmergencyShareTokenDTO` carries metadata only; the plaintext token is
    returned **once** at mint time inside `EmergencyShareTokenWithSecretDTO`
    and never again.

  * Field literals mirror `app.models.emergency` Enums so OpenAPI codegen
    produces clean TypeScript string unions for the frontend.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DataResponse


# Mirrors `app.models.emergency.AssistanceNeedEnum`.
AssistanceNeedLiteral = Literal[
    "walking",
    "communication",
    "dietary",
    "hearing",
    "vision",
    "cognitive",
]

# Mirrors `app.models.emergency.EmergencyCardFieldEnum`. The keys allowed
# in the `field_visibility` map.
EmergencyCardFieldLiteral = Literal[
    "blood_type",
    "age",
    "gender",
    "allergies",
    "conditions",
    "medications",
    "contacts",
    "assistance",
    "equipment",
    "communication",
    "preferred_language",
]


# ─────────────────────────────────────────────────────────────────────────────
# Public-facing card (unauthenticated wire format)
# ─────────────────────────────────────────────────────────────────────────────


class PublicEmergencyContact(BaseModel):
    """ICE contact subset shipped on the public card.

    Email is intentionally **dropped** even though `user_profiles.emergency_contacts`
    can hold one — emails are low value in the ER and high value to spammers
    that scrape leaked tokens.
    """

    name: str
    relationship: Optional[str] = None
    phone: str


class PublicEmergencyMedication(BaseModel):
    """Drug entry on the public card.

    Strictly `name` + optional `strength`. Dose schedule, prescriber, clinic,
    refill data, and all other `medication_plans` columns are **never** shipped.
    """

    name: str
    strength: Optional[str] = None


class PublicEmergencyCardDTO(BaseModel):
    """Hard-coded contract for the unauthenticated public card.

    Adding a field here is a privacy decision that requires updating the
    blocklist test (`test_no_email_no_dob_no_address_in_public_dto`).
    Any field that is `None` / empty will be omitted from the rendered card
    by the FE — the wire format itself does not encode "show / hide" choices.
    """

    # Identity (computed, never raw DOB)
    full_name: Optional[str] = None
    age_years: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[Literal["male", "female", "other"]] = None
    preferred_language: Optional[str] = None

    # Clinically actionable
    blood_type: Optional[str] = None
    nkda_confirmed: bool = False
    allergies: list[str] = Field(default_factory=list)
    chronic_conditions: list[str] = Field(default_factory=list)
    medications: list[PublicEmergencyMedication] = Field(default_factory=list)

    # Optional supplementary
    assistance_needed: list[AssistanceNeedLiteral] = Field(default_factory=list)
    equipment_notes: Optional[str] = None
    communication_notes: Optional[str] = None

    # ICE
    emergency_contacts: list[PublicEmergencyContact] = Field(default_factory=list)

    # Provenance / freshness — useful for responders to gauge staleness.
    last_updated_at: Optional[datetime.datetime] = None
    # M2 — `card_short_id` was removed from the public DTO. It was a stable
    # token-UUID prefix that allowed coffee-shop scanners to correlate two
    # patients' cards across hospitals. Owner-side payloads keep the full
    # token UUID; the public/anonymous viewer no longer gets a stable handle.


class PublicEmergencyCardResponse(DataResponse[PublicEmergencyCardDTO]):
    ...


# ─────────────────────────────────────────────────────────────────────────────
# Owner-side schemas
# ─────────────────────────────────────────────────────────────────────────────


_KNOWN_VISIBILITY_FIELDS = {
    "blood_type",
    "age",
    "gender",
    "allergies",
    "conditions",
    "medications",
    "contacts",
    "assistance",
    "equipment",
    "communication",
    "preferred_language",
}


class EmergencyProfileUpdate(BaseModel):
    """PATCH /v1/users/me/emergency-profile body.

    `None` = no-op (field absent); explicit values are persisted. Use
    `is_published=false` as the master kill switch independent of revoking
    individual tokens.
    """

    is_published: Optional[bool] = None
    assistance_needed: Optional[list[AssistanceNeedLiteral]] = None
    equipment_notes: Optional[str] = Field(default=None, max_length=500)
    communication_notes: Optional[str] = Field(default=None, max_length=500)
    field_visibility: Optional[dict[EmergencyCardFieldLiteral, bool]] = None
    nkda_confirmed: Optional[bool] = None
    preferred_language: Optional[str] = Field(default=None, max_length=8)

    @model_validator(mode="before")
    @classmethod
    def _drop_unknown_visibility_keys(cls, data: object) -> object:
        """M1 — silently drop unknown keys from `field_visibility`.

        Pydantic's `dict[Literal, bool]` validation accepts unknown keys in
        practice on permissive configs; we want defence-in-depth so a
        forged PATCH cannot pollute the JSONB column with attacker-chosen
        garbage that future code might trust as a feature flag. Forward-
        compatible (we don't 4xx) so old clients keep working.
        """
        if not isinstance(data, dict):
            return data
        raw_vis = data.get("field_visibility")
        if not isinstance(raw_vis, dict):
            return data
        cleaned = {
            k: v for k, v in raw_vis.items() if k in _KNOWN_VISIBILITY_FIELDS
        }
        # Replace with the cleaned dict (or drop the key entirely if it
        # would otherwise be empty + the caller didn't actually set it).
        data["field_visibility"] = cleaned
        return data


class EmergencyShareTokenDTO(BaseModel):
    """Public-safe view of a token row — no plaintext, no hash."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    created_at: datetime.datetime
    revoked_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    last_accessed_at: Optional[datetime.datetime] = None
    access_count: int = 0
    is_active: bool = True


class EmergencyShareTokenWithSecretDTO(BaseModel):
    """Returned **once** at mint time. The plaintext `token` and `share_url`
    are not retrievable later — owner must re-mint if lost.

    `wallet_pdf_data_url` is `None` when the WeasyPrint stack is not
    installed on this worker — clients fall back to the browser print
    stylesheet on the dashboard.
    """

    token_meta: EmergencyShareTokenDTO
    token: str
    share_url: str
    qr_png_data_url: str
    wallet_pdf_data_url: Optional[str] = None


class EmergencyShareTokenCreateBody(BaseModel):
    label: str = Field(min_length=1, max_length=64)
    # Override the completeness gate — required when the derived card is
    # below the publishability threshold.
    acknowledge_low_completeness: bool = False


class EmergencyAccessLogDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    token_id: uuid.UUID
    ip_truncated: Optional[str] = None
    user_agent: Optional[str] = None
    accessed_at: datetime.datetime


class CompletenessNudge(BaseModel):
    """One row in the dashboard's `MissingDataBanner`.

    `level='critical'` blocks publication unless the owner explicitly
    overrides via `acknowledge_low_completeness`.
    """

    field: str
    level: Literal["critical", "recommended"]
    message_key: str
    fix_path: str


class EmergencyProfileOwnerView(BaseModel):
    """GET /v1/users/me/emergency-profile response — preview + manage data.

    The `card` field contains the same DTO that the public route would emit
    *with current visibility applied*, so the dashboard preview is pixel-true
    to what responders will see.
    """

    is_published: bool
    assistance_needed: list[AssistanceNeedLiteral] = Field(default_factory=list)
    equipment_notes: Optional[str] = None
    communication_notes: Optional[str] = None
    field_visibility: dict[str, bool] = Field(default_factory=dict)
    nkda_confirmed: bool = False
    preferred_language: Optional[str] = None
    last_published_at: Optional[datetime.datetime] = None

    card: PublicEmergencyCardDTO
    completeness_score: int = Field(ge=0, le=100)
    missing_critical_fields: list[str] = Field(default_factory=list)
    nudges: list[CompletenessNudge] = Field(default_factory=list)

    tokens: list[EmergencyShareTokenDTO] = Field(default_factory=list)
    active_token_count: int = 0
    max_active_tokens: int = 5


# ─── Response envelopes ──────────────────────────────────────────────────────


class EmergencyProfileOwnerResponse(DataResponse[EmergencyProfileOwnerView]):
    ...


class EmergencyShareTokenListResponse(DataResponse[list[EmergencyShareTokenDTO]]):
    ...


class EmergencyShareTokenWithSecretResponse(
    DataResponse[EmergencyShareTokenWithSecretDTO]
):
    ...


class EmergencyAccessLogListResponse(DataResponse[list[EmergencyAccessLogDTO]]):
    ...
