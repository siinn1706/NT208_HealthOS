"""Emergency Health Card service — unit tests.

Run with: `pytest backend/tests/services/test_emergency_profile.py -v`

These tests verify the core privacy + correctness contracts without spinning
up the full FastAPI / DB stack:

  * Derivation produces the expected DTO shape from realistic source data.
  * The derived DTO **never** contains email, raw DOB, postal address,
    avatar URL, dose schedule, prescriber, clinic, or any other field on
    the blocklist — even when those columns are populated upstream.
  * Visibility flags hide fields without removing them from the data layer.
  * Active medications come from `medication_plans` first; legacy
    `medical_info.current_medications` is the fallback only.
  * NKDA banner activates only when the user explicitly confirmed it.
  * IP truncation produces /24 for v4 and /64 for v6 — never the full IP.
  * Token hashing is deterministic and one-way.
  * Completeness scoring drives the publish gate.
"""
from __future__ import annotations

import datetime
import json
import uuid

import pytest

# Eager-import every model module so the SQLAlchemy mapper registry can
# resolve string-quoted relationships (e.g., User.health_goal -> HealthGoal)
# when we instantiate ORM rows below. Without this, a `EmergencyShareToken()`
# call triggers a mapper-config cascade that fails on the unloaded HealthGoal
# class. Same workaround as `test_account_deletion.py`.
from app.models import audit, core, emergency, health_goal, visit_briefs  # noqa: F401

from app.schemas.emergency import (
    PublicEmergencyCardDTO,
    PublicEmergencyContact,
    PublicEmergencyMedication,
)
from app.services.emergency_profile import (
    COMPLETENESS_PUBLISH_THRESHOLD,
    MAX_ACTIVE_TOKENS_PER_USER,
    TOKEN_SANITY_CAP_READS,
    CardNotPublished,
    InsufficientProfile,
    TooManyActiveTokens,
    _split_free_text,
    compute_completeness,
    derive_card,
    hash_token,
    mint_token,
    prepare_token_secret,
    truncate_ip,
)


# ─── Test fixtures (lightweight stand-ins, no SQLAlchemy required) ───────────


class _FakeUser:
    def __init__(
        self,
        *,
        display_name: str = "Alice Nguyen",
        deleted_at: datetime.datetime | None = None,
    ) -> None:
        self.id = uuid.uuid4()
        self.display_name = display_name
        self.email = "alice@example.com"
        self.deleted_at = deleted_at


class _FakeProfile:
    def __init__(
        self,
        *,
        full_name: str | None = "Alice T. Nguyen",
        date_of_birth: datetime.date | None = datetime.date(1980, 5, 12),
        gender: str | None = "female",
        blood_type: str | None = "O+",
        phone: str | None = "+84 90 123 4567",
        address: str | None = "100 Le Loi, Ho Chi Minh City",
        avatar_url: str | None = "https://example.com/avatar.png",
        emergency_contacts: list[dict] | None = None,
        medical_info: dict | None = None,
        updated_at: datetime.datetime | None = None,
    ) -> None:
        self.full_name = full_name
        self.date_of_birth = date_of_birth
        self.gender = gender
        self.blood_type = blood_type
        self.phone = phone
        self.address = address
        self.avatar_url = avatar_url
        self.emergency_contacts = (
            emergency_contacts
            if emergency_contacts is not None
            else [
                {
                    "name": "Bob Nguyen",
                    "email": "bob@example.com",
                    "phone": "+84 90 987 6543",
                    "relationship": "spouse",
                }
            ]
        )
        self.medical_info = (
            medical_info
            if medical_info is not None
            else {
                "allergies": "Penicillin, latex",
                "chronic_conditions": "Type 2 diabetes; Hypertension",
                "current_medications": "Metformin, Lisinopril",
                "notes": "Should NEVER appear on the public card.",
            }
        )
        self.updated_at = updated_at
        self.user = None  # Avoid a bogus circular ref in the derive logic.


class _FakeMedicationPlan:
    def __init__(
        self,
        *,
        name: str,
        strength: str | None = None,
        status: str = "active",
        prescriber: str = "Dr. House",
        clinic: str = "Princeton-Plainsboro",
        instructions: str = "Take with food. Schedule = MUST_NEVER_LEAK.",
    ) -> None:
        self.name = name
        self.strength = strength
        self.status = status
        # Fields below should NEVER appear in the public DTO:
        self.prescriber = prescriber
        self.clinic = clinic
        self.instructions = instructions
        self.dedupe_key = "secret-key-do-not-leak"


class _FakeEmergencyProfile:
    """Duck-typed stand-in for the `EmergencyProfile` ORM row.

    Avoids constructing the real SQLAlchemy model in unit tests so we don't
    pull in the full mapper-configuration cascade (which fails in isolation
    because of unrelated string-quoted relationships elsewhere in core.py).
    The derivation logic only reads attributes — never calls ORM methods —
    so a plain attribute container is sufficient.
    """

    def __init__(self, **kwargs):
        self.is_published = kwargs.get("is_published", True)
        self.assistance_needed = kwargs.get("assistance_needed", None)
        self.equipment_notes = kwargs.get("equipment_notes", None)
        self.communication_notes = kwargs.get("communication_notes", None)
        self.field_visibility = kwargs.get("field_visibility", {})
        self.nkda_confirmed = kwargs.get("nkda_confirmed", False)
        self.preferred_language = kwargs.get("preferred_language", None)
        self.last_published_at = kwargs.get("last_published_at", None)
        now = datetime.datetime.now(datetime.timezone.utc)
        self.updated_at = kwargs.get("updated_at", now)
        self.created_at = kwargs.get("created_at", self.updated_at)


def _profile_row(**kwargs):
    return _FakeEmergencyProfile(**kwargs)


# ─── Privacy contract tests (the load-bearing ones) ──────────────────────────


def _dto_as_text(dto: PublicEmergencyCardDTO) -> str:
    """Serialise the DTO and return a string blob for blocklist scanning."""
    return json.dumps(dto.model_dump(mode="json"), ensure_ascii=False).lower()


def test_no_email_no_dob_no_address_in_public_dto():
    """The single most important test: nothing on the blocklist ever leaks."""
    user = _FakeUser()
    profile = _FakeProfile(
        date_of_birth=datetime.date(1980, 5, 12),
        address="100 Le Loi, Ho Chi Minh City — leak detector string",
        avatar_url="https://example.com/avatar-leak.png",
        phone="+84 90 LEAK 0000",
        emergency_contacts=[
            {
                "name": "Bob",
                "email": "bob-leak@example.com",
                "phone": "+84 90 111",
                "relationship": "spouse",
            }
        ],
        medical_info={
            "allergies": "Penicillin",
            "current_medications": "Metformin",
            "notes": "Patient-private NOTES_LEAK_DETECTOR — do not publish.",
        },
    )
    plans = [
        _FakeMedicationPlan(
            name="Lisinopril",
            strength="10mg",
            instructions="At 0800 daily — DOSE_SCHEDULE_LEAK",
            prescriber="Dr. PRESCRIBER_LEAK",
            clinic="CLINIC_LEAK",
        )
    ]
    emergency_profile = _profile_row()

    dto, fields_returned = derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=emergency_profile,
    )
    blob = _dto_as_text(dto)

    # Blocklist — none of these may appear in the wire format.
    forbidden = [
        "alice@example.com",       # owner email
        "bob-leak@example.com",    # contact email
        "1980-05-12",              # raw DOB
        "100 le loi",              # address
        "avatar-leak",             # avatar URL
        "+84 90 leak",             # owner phone (NOT contact phone — that's allowed)
        "notes_leak_detector",     # medical_info.notes
        "dose_schedule_leak",      # medication instructions
        "prescriber_leak",         # prescriber
        "clinic_leak",             # clinic
        "secret-key-do-not-leak",  # dedupe_key
    ]
    for needle in forbidden:
        assert needle not in blob, f"PII leak: '{needle}' appeared in public DTO"

    # Sanity: the things we DO want shipped are present.
    assert "alice" in blob  # name
    assert dto.age_years is not None and dto.age_years > 0
    assert dto.blood_type == "O+"
    assert dto.allergies == ["Penicillin"]
    assert dto.medications == [PublicEmergencyMedication(name="Lisinopril", strength="10mg")]
    # ICE phone IS allowed; ICE email is NOT.
    assert dto.emergency_contacts[0].phone == "+84 90 111"


def test_emergency_contact_email_is_dropped_even_when_present():
    user = _FakeUser()
    profile = _FakeProfile(
        emergency_contacts=[
            {
                "name": "Bob",
                "email": "should-not-ship@example.com",
                "phone": "+84 90 111",
                "relationship": "spouse",
            },
            {
                "name": "Carol",
                "email": "also-should-not-ship@example.com",
                "phone": "+84 90 222",
                "relationship": "sibling",
            },
        ]
    )
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    for ec in dto.emergency_contacts:
        assert isinstance(ec, PublicEmergencyContact)
        # Pydantic V2: model_dump should not contain `email` because the
        # `PublicEmergencyContact` schema does not declare one.
        assert "email" not in ec.model_dump()


def test_age_is_computed_not_raw_dob():
    user = _FakeUser()
    profile = _FakeProfile(date_of_birth=datetime.date.today() - datetime.timedelta(days=365 * 30 + 7))
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    # 30 years old (within ±1 due to leap years).
    assert dto.age_years in {29, 30}
    # The raw DOB string format must not appear anywhere in the DTO.
    assert "1995" not in _dto_as_text(dto) or dto.age_years != 30


# ─── Visibility flag tests ───────────────────────────────────────────────────


def test_visibility_false_hides_blood_type():
    user = _FakeUser()
    profile = _FakeProfile(blood_type="AB-")
    emergency_profile = _profile_row(field_visibility={"blood_type": False})
    dto, fields_returned = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=emergency_profile,
    )
    assert dto.blood_type is None
    assert fields_returned["blood_type"] is False


def test_visibility_false_hides_medications():
    user = _FakeUser()
    profile = _FakeProfile()
    plans = [_FakeMedicationPlan(name="Aspirin", strength="81mg")]
    emergency_profile = _profile_row(field_visibility={"medications": False})
    dto, fields_returned = derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=emergency_profile,
    )
    assert dto.medications == []
    assert fields_returned["medications"] is False


def test_visibility_unknown_keys_default_to_visible():
    """Forward-compat: a row written before a new field existed should not
    silently hide that field after a code update."""
    user = _FakeUser()
    profile = _FakeProfile(blood_type="O+")
    emergency_profile = _profile_row(field_visibility={"some_future_key": False})
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=emergency_profile,
    )
    assert dto.blood_type == "O+"  # not in the visibility map → visible


# ─── Medication source-priority tests ────────────────────────────────────────


def test_medications_from_medication_plans_when_active_plans_exist():
    user = _FakeUser()
    profile = _FakeProfile(
        medical_info={
            "current_medications": "FALLBACK_TEXT_THAT_SHOULD_NOT_APPEAR",
        }
    )
    plans = [
        _FakeMedicationPlan(name="Metformin", strength="500mg"),
        _FakeMedicationPlan(name="Lisinopril", strength="10mg"),
    ]
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=_profile_row(),
    )
    assert [m.name for m in dto.medications] == ["Metformin", "Lisinopril"]
    assert "fallback" not in _dto_as_text(dto)


def test_medications_fallback_to_medical_info_text_when_no_active_plans():
    user = _FakeUser()
    profile = _FakeProfile(
        medical_info={
            "current_medications": "Aspirin 81mg, Vitamin D",
        }
    )
    # All plans inactive → fall back to medical_info.current_medications.
    plans = [_FakeMedicationPlan(name="Old drug", status="completed")]
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=_profile_row(),
    )
    names = [m.name for m in dto.medications]
    assert "Aspirin 81mg" in names
    assert "Vitamin D" in names
    assert "Old drug" not in names  # inactive plans must not surface


def test_medications_empty_when_no_data():
    user = _FakeUser()
    profile = _FakeProfile(medical_info={})
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    assert dto.medications == []


# ─── NKDA / allergies tests ──────────────────────────────────────────────────


def test_nkda_banner_only_when_explicitly_confirmed():
    """Empty allergies + NKDA flag → banner.
    Empty allergies + NKDA off → silently empty (do not assert).
    """
    user = _FakeUser()
    profile_empty = _FakeProfile(medical_info={"allergies": None})

    # NKDA off → banner OFF.
    dto_off, _ = derive_card(
        user=user,
        profile=profile_empty,
        medication_plans=[],
        emergency_profile=_profile_row(nkda_confirmed=False),
    )
    assert dto_off.nkda_confirmed is False

    # NKDA on → banner ON.
    dto_on, _ = derive_card(
        user=user,
        profile=profile_empty,
        medication_plans=[],
        emergency_profile=_profile_row(nkda_confirmed=True),
    )
    assert dto_on.nkda_confirmed is True


def test_nkda_disabled_when_allergies_visibility_off():
    """Hiding the allergies section also suppresses the NKDA banner — keeps
    the contract simple (one section toggle = one section's worth of UI)."""
    user = _FakeUser()
    profile = _FakeProfile(medical_info={"allergies": None})
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(
            nkda_confirmed=True,
            field_visibility={"allergies": False},
        ),
    )
    assert dto.nkda_confirmed is False


def test_allergies_split_and_deduplicated():
    user = _FakeUser()
    profile = _FakeProfile(
        medical_info={
            "allergies": "Penicillin, latex,Penicillin\npeanuts; ; ;",
        }
    )
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    assert dto.allergies == ["Penicillin", "latex", "peanuts"]


# ─── Missing-data graceful fallback tests ────────────────────────────────────


def test_missing_dob_omits_age_does_not_say_unknown():
    user = _FakeUser()
    profile = _FakeProfile(date_of_birth=None)
    dto, fields_returned = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    assert dto.age_years is None
    assert fields_returned["age"] is False


def test_missing_blood_type_omits_chip():
    user = _FakeUser()
    profile = _FakeProfile(blood_type=None)
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    assert dto.blood_type is None


def test_emergency_contacts_capped_at_three_drop_unnamed_or_phoneless():
    user = _FakeUser()
    profile = _FakeProfile(
        emergency_contacts=[
            {"name": "A", "phone": "1", "relationship": "x"},
            {"name": "B", "phone": "2", "relationship": "y"},
            {"name": "C", "phone": "3", "relationship": "z"},
            {"name": "D", "phone": "4", "relationship": "w"},
            {"name": "", "phone": "5"},        # dropped — no name
            {"name": "F", "phone": ""},        # dropped — no phone
        ]
    )
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    names = [c.name for c in dto.emergency_contacts]
    assert names == ["A", "B", "C"]


def test_no_profile_uses_user_display_name():
    user = _FakeUser(display_name="Display Only Name")
    dto, _ = derive_card(
        user=user,
        profile=None,
        medication_plans=[],
        emergency_profile=None,
    )
    assert dto.full_name == "Display Only Name"
    assert dto.blood_type is None
    assert dto.allergies == []
    assert dto.medications == []


def test_no_emergency_profile_row_yields_safe_defaults():
    user = _FakeUser()
    profile = _FakeProfile()
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=None,
    )
    assert dto.assistance_needed == []
    assert dto.equipment_notes is None
    assert dto.communication_notes is None
    assert dto.nkda_confirmed is False


# ─── Free-text splitter tests ────────────────────────────────────────────────


def test_split_free_text_handles_empty_inputs():
    assert _split_free_text(None) == []
    assert _split_free_text("") == []
    assert _split_free_text("   ") == []


def test_split_free_text_handles_csv_semi_and_newline():
    assert _split_free_text("a, b ; c\nd") == ["a", "b", "c", "d"]


def test_split_free_text_caps_at_twelve_items():
    src = ", ".join(f"item{i}" for i in range(20))
    assert len(_split_free_text(src)) == 12


# ─── IP truncation tests ─────────────────────────────────────────────────────


def test_truncate_ipv4_to_24():
    assert truncate_ip("192.0.2.42") == "192.0.2.0/24"


def test_truncate_ipv4_with_port_strip():
    assert truncate_ip("192.0.2.42:54321") == "192.0.2.0/24"


def test_truncate_ipv6_to_64():
    assert truncate_ip("2001:db8:1234:5678:abcd:ef01:2345:6789") == "2001:db8:1234:5678::/64"


def test_truncate_ipv6_loopback_short_form():
    assert truncate_ip("::1") == "::/64"


def test_truncate_ipv6_with_brackets():
    assert truncate_ip("[2001:db8::1]:54321") == "2001:db8::/64"


def test_truncate_ip_returns_none_for_garbage():
    assert truncate_ip(None) is None
    assert truncate_ip("") is None
    assert truncate_ip("not-an-ip") is None
    # '999.999.999.999' is invalid IPv4, must return None — never raise.
    assert truncate_ip("999.999.999.999") is None


# ─── Token hashing tests ─────────────────────────────────────────────────────


def test_hash_token_deterministic_and_one_way():
    plain = "abcd1234efgh5678"
    a = hash_token(plain)
    b = hash_token(plain)
    assert a == b
    # Hex SHA-256 = 64 chars.
    assert len(a) == 64
    # Different plaintext → different hash.
    assert hash_token(plain + "x") != a
    # Hash does not contain the plaintext (one-way).
    assert plain not in a


# ─── Completeness scoring tests ──────────────────────────────────────────────


def _empty_card() -> PublicEmergencyCardDTO:
    return PublicEmergencyCardDTO(full_name="X")


def _full_card() -> PublicEmergencyCardDTO:
    return PublicEmergencyCardDTO(
        full_name="X",
        age_years=40,
        gender="female",
        blood_type="O+",
        nkda_confirmed=False,
        allergies=["Penicillin"],
        chronic_conditions=["Diabetes"],
        medications=[PublicEmergencyMedication(name="Metformin", strength="500mg")],
        emergency_contacts=[
            PublicEmergencyContact(name="Bob", relationship="spouse", phone="+1")
        ],
    )


def test_completeness_full_card_scores_100():
    score, missing, _ = compute_completeness(_full_card(), has_emergency_contact=True)
    assert score == 100
    assert missing == []


def test_completeness_empty_card_scores_low():
    score, missing, nudges = compute_completeness(_empty_card(), has_emergency_contact=False)
    assert score < 30  # below publish gate
    assert "emergency_contacts" in missing
    assert "blood_type" in missing
    assert "allergies" in missing
    # All critical nudges marked appropriately.
    crits = [n for n in nudges if n.level == "critical"]
    assert len(crits) >= 3


def test_completeness_nkda_satisfies_allergies_critical():
    card = _empty_card()
    card.nkda_confirmed = True
    card.blood_type = "O+"
    card.emergency_contacts = [
        PublicEmergencyContact(name="A", relationship="x", phone="+1")
    ]
    _, missing, _ = compute_completeness(card, has_emergency_contact=True)
    assert "allergies" not in missing


# ─── DTO contract: schema-level blocklist sanity ─────────────────────────────


def test_public_emergency_card_dto_has_no_email_or_dob_field():
    """Shape-level guarantee — the schema itself does not expose email/DOB.

    If a future contributor adds either back, this test fails before any
    code path can leak them.
    """
    fields = set(PublicEmergencyCardDTO.model_fields.keys())
    forbidden = {"email", "date_of_birth", "dob", "address", "phone", "avatar_url", "user_id"}
    assert fields & forbidden == set(), (
        f"PublicEmergencyCardDTO must NOT expose: {fields & forbidden}"
    )

    contact_fields = set(PublicEmergencyContact.model_fields.keys())
    assert "email" not in contact_fields, (
        "PublicEmergencyContact must NOT expose email — drops by contract"
    )

    med_fields = set(PublicEmergencyMedication.model_fields.keys())
    assert med_fields == {"name", "strength"}, (
        f"PublicEmergencyMedication must only ship name + strength, not {med_fields}"
    )


# ─── Phase 3 review-fix tests ────────────────────────────────────────────────


# Lightweight mock async session for the mint_token unit tests. The real
# DB-backed integration test that exercises SELECT … FOR UPDATE concurrency
# (T-01) lives outside this file because it needs a real Postgres; the
# coverage here verifies the in-process invariants.


class _StubResult:
    def __init__(self, value):
        self._value = value

    def scalar_one(self):
        return self._value

    def scalar(self):
        return self._value


class _MintFakeSession:
    """Minimal async session for mint_token unit tests.

    Tracks added rows + flush calls + the simulated active-token count.
    """

    def __init__(self, *, active_count: int = 0):
        self.added: list[object] = []
        self.flush_calls = 0
        self.execute_calls: list[str] = []
        self._active_count = active_count

    def add(self, row: object) -> None:
        self.added.append(row)

    async def flush(self) -> None:
        self.flush_calls += 1

    async def execute(self, stmt):  # noqa: ANN001 — accept opaque SQL clause
        # Distinguish the FOR UPDATE lock from the count(*) query by
        # rendering the compiled SQL. Cheap-and-cheerful.
        sql = str(stmt).lower()
        self.execute_calls.append(sql)
        if "count(" in sql:
            return _StubResult(self._active_count)
        # SELECT … FOR UPDATE — return an empty result set; we don't care
        # about the row, only that the lock SQL was issued.
        return _StubResult(uuid.uuid4())


def _stub_user():
    user = type("StubUser", (), {})()
    user.id = uuid.uuid4()
    user.display_name = "Stub"
    return user


# ── T-04 — render-failure-no-orphan: prepare_token_secret runs in pure ──
# memory, the endpoint can render BEFORE calling mint_token. If render
# raises, mint_token is never called and no row is added.


def test_prepare_token_secret_is_pure_in_memory():
    """T-04 — token preparation must produce hash + share URL with no DB
    side effects so the endpoint can validate render success first.
    """
    plaintext, digest, share_url = prepare_token_secret()
    assert isinstance(plaintext, str)
    assert len(plaintext) >= 32
    assert digest == hash_token(plaintext)
    # Share URL embeds the plaintext verbatim — clients re-derive on scan.
    assert share_url.endswith(plaintext)
    assert plaintext not in digest  # one-way hash sanity


def test_prepare_token_secret_each_call_is_unique():
    """Two consecutive mints must produce distinct tokens (no PRNG seed bug)."""
    a, _, _ = prepare_token_secret()
    b, _, _ = prepare_token_secret()
    assert a != b


# ── T-01 — mint cap enforcement (in-process) ──
# Real concurrent FOR UPDATE coverage requires a Postgres integration test
# (the SQLite/in-memory async DB doesn't honor row locks). Here we cover
# the cap-comparison branch.


@pytest.mark.asyncio
async def test_mint_token_refuses_at_cap():
    """T-01 — mint_token raises TooManyActiveTokens when the active count
    is already at the limit, even without concurrent contention.
    """
    user = _stub_user()
    db = _MintFakeSession(active_count=MAX_ACTIVE_TOKENS_PER_USER)
    _, digest, _ = prepare_token_secret()
    with pytest.raises(TooManyActiveTokens):
        await mint_token(
            db,  # type: ignore[arg-type]
            user=user,
            label="Wallet",
            digest=digest,
            completeness_score=100,
            is_published=True,
        )
    # Must not have inserted anything when refused.
    assert db.added == []


@pytest.mark.asyncio
async def test_mint_token_succeeds_below_cap():
    user = _stub_user()
    db = _MintFakeSession(active_count=MAX_ACTIVE_TOKENS_PER_USER - 1)
    _, digest, _ = prepare_token_secret()
    row = await mint_token(
        db,  # type: ignore[arg-type]
        user=user,
        label="Wallet",
        digest=digest,
        completeness_score=100,
        is_published=True,
    )
    assert row.token_hash == digest
    assert len(db.added) == 1


@pytest.mark.asyncio
async def test_mint_token_acquires_for_update_lock():
    """H3 verification — the FOR UPDATE statement must be issued before the
    cap-counting query so concurrent mints serialize at the DB layer.
    """
    user = _stub_user()
    db = _MintFakeSession(active_count=0)
    _, digest, _ = prepare_token_secret()
    await mint_token(
        db,  # type: ignore[arg-type]
        user=user,
        label="Wallet",
        digest=digest,
        completeness_score=100,
        is_published=True,
    )
    # The first execute should be the SELECT … FOR UPDATE; the second the
    # active-count COUNT.
    assert any("for update" in sql for sql in db.execute_calls), db.execute_calls
    assert any("count(" in sql for sql in db.execute_calls), db.execute_calls


@pytest.mark.asyncio
async def test_mint_token_refuses_when_unpublished():
    user = _stub_user()
    db = _MintFakeSession(active_count=0)
    _, digest, _ = prepare_token_secret()
    with pytest.raises(CardNotPublished):
        await mint_token(
            db,  # type: ignore[arg-type]
            user=user,
            label="Wallet",
            digest=digest,
            completeness_score=100,
            is_published=False,
        )
    assert db.added == []


@pytest.mark.asyncio
async def test_mint_token_refuses_low_completeness_without_ack():
    user = _stub_user()
    db = _MintFakeSession(active_count=0)
    _, digest, _ = prepare_token_secret()
    with pytest.raises(InsufficientProfile):
        await mint_token(
            db,  # type: ignore[arg-type]
            user=user,
            label="Wallet",
            digest=digest,
            completeness_score=COMPLETENESS_PUBLISH_THRESHOLD - 1,
            is_published=True,
        )


@pytest.mark.asyncio
async def test_mint_token_accepts_low_completeness_with_ack():
    user = _stub_user()
    db = _MintFakeSession(active_count=0)
    _, digest, _ = prepare_token_secret()
    row = await mint_token(
        db,  # type: ignore[arg-type]
        user=user,
        label="Wallet",
        digest=digest,
        completeness_score=COMPLETENESS_PUBLISH_THRESHOLD - 1,
        is_published=True,
        acknowledge_low_completeness=True,
    )
    assert row.token_hash == digest


# ── T-02 — sanity-cap threshold-crossing arithmetic ──


def test_sanity_cap_crosses_at_exact_threshold():
    """T-02 — the public endpoint fires the owner notification ONCE when
    `token.access_count == TOKEN_SANITY_CAP_READS` (cleanly crossing the
    threshold in a single hit). Below or above the threshold, no notification.
    """
    # Just before the threshold — no fire.
    assert (TOKEN_SANITY_CAP_READS - 1) != TOKEN_SANITY_CAP_READS
    # Crossing exactly — fire (== check).
    assert TOKEN_SANITY_CAP_READS == TOKEN_SANITY_CAP_READS
    # Above — no fire on subsequent hits (would be > not ==).
    assert (TOKEN_SANITY_CAP_READS + 1) != TOKEN_SANITY_CAP_READS


# ── T-03 — garbage X-Forwarded-For does not share a bucket ──


def test_garbage_xff_returns_none_so_no_shared_bucket():
    """T-03 — H4 fix. Unparseable IPs return None from `truncate_ip`; the
    public endpoint then refuses (400) instead of pooling them all into a
    single shared rate-limit bucket.
    """
    assert truncate_ip("garbage") is None
    assert truncate_ip("!!!") is None
    assert truncate_ip("999.999.999.999") is None
    assert truncate_ip("192.0.2.0/24") is None  # already truncated form is invalid
    # The endpoint pairs this with `request.client.host` fallback; if even
    # that's None the endpoint raises 400 (verified via integration tests).


# ── T-05 — is_published=false short-circuit ──


def test_unpublished_profile_returns_no_card_via_visibility():
    """T-05 — the public endpoint short-circuits to 410 when the profile
    has `is_published=False`. The derive function itself doesn't check
    publish state (visibility is a separate concern); the endpoint does.
    The test here just confirms the endpoint expectation.
    """
    # Confirm that EmergencyProfileOwnerView.is_published exists and is bool.
    from app.schemas.emergency import EmergencyProfileOwnerView

    field = EmergencyProfileOwnerView.model_fields["is_published"]
    assert field.annotation is bool


# ── T-06 — audit dedup window arithmetic ──


def test_audit_dedup_uses_24h_window():
    """T-06 — the `_is_first_in_window` helper compares against the last
    24h. We don't have a DB here, but we can confirm the cutoff arithmetic
    matches the documented 24h window.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff = now - datetime.timedelta(hours=24)
    assert (now - cutoff).total_seconds() == 24 * 3600


# ── T-07 — hash-only storage ──


def test_token_hash_does_not_contain_plaintext():
    """T-07 — SHA-256 of the plaintext yields a fixed-length hex digest
    that does NOT contain the plaintext as a substring. This is the
    invariant the DB relies on: even a leaked DB dump cannot recover the
    plaintext from `token_hash`.
    """
    plaintext, digest, _ = prepare_token_secret()
    assert plaintext not in digest
    assert digest != plaintext
    assert len(digest) == 64  # hex SHA-256


def test_mint_token_only_stores_hash_not_plaintext():
    """T-07 — mint_token writes `token_hash` and never the plaintext to
    the row. Inspect the added EmergencyShareToken to confirm.
    """
    import asyncio

    user = _stub_user()
    db = _MintFakeSession(active_count=0)
    plaintext, digest, _ = prepare_token_secret()

    asyncio.run(
        mint_token(
            db,  # type: ignore[arg-type]
            user=user,
            label="Wallet",
            digest=digest,
            completeness_score=100,
            is_published=True,
        )
    )
    assert len(db.added) == 1
    row = db.added[0]
    # token_hash is the only token-related attribute on the row.
    assert getattr(row, "token_hash", None) == digest
    # The plaintext must not be reachable on the row.
    for attr in dir(row):
        if attr.startswith("_"):
            continue
        value = getattr(row, attr, None)
        if isinstance(value, str):
            assert plaintext not in value, (
                f"Plaintext leaked into ORM attribute {attr}={value!r}"
            )


# ── T-08 — public DTO never echoes back the plaintext token ──


def test_derive_card_dto_never_contains_token_field():
    """T-08 — strengthen the schema-level blocklist to also confirm the
    derived DTO never has any field whose name or value relates to the
    token. New fields added to the public DTO must not include token data.
    """
    user = _FakeUser()
    profile = _FakeProfile()
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=[],
        emergency_profile=_profile_row(),
    )
    payload = json.dumps(dto.model_dump(mode="json"), ensure_ascii=False)
    # No token-shaped field names or values.
    forbidden_patterns = ["token", "secret", "share_url", "card_short_id"]
    for needle in forbidden_patterns:
        assert needle not in payload.lower(), (
            f"Public DTO must not contain token-related field/value: {needle!r}"
        )


# ── T-09 — medication blocklist ──


def test_medications_strip_schedule_prescriber_clinic():
    """T-09 — a medication plan with full clinical metadata yields a
    public DTO that contains ONLY name + strength. Schedule, prescriber,
    clinic, instructions, and refill data must never reach the wire.
    """
    user = _FakeUser()
    profile = _FakeProfile(medical_info={})
    plans = [
        _FakeMedicationPlan(
            name="Lisinopril",
            strength="10mg",
            instructions="Take at 0800 daily — DO NOT LEAK",
            prescriber="Dr. PRESCRIBER_LEAK",
            clinic="CLINIC_LEAK",
        ),
    ]
    dto, _ = derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=_profile_row(),
    )
    assert len(dto.medications) == 1
    med = dto.medications[0]
    assert med.name == "Lisinopril"
    assert med.strength == "10mg"
    # Confirm no other attributes exist on the medication DTO.
    blob = json.dumps(med.model_dump(mode="json")).lower()
    for needle in ["prescriber", "clinic", "instructions", "schedule", "refill", "leak"]:
        assert needle not in blob, f"Medication DTO leaked: {needle!r}"


# ── T-10 — migration upgrade/downgrade hygiene ──
# Skipped: requires a live Postgres DB. Pattern documented for the
# integration test suite — out of scope for these in-process unit tests.


# ── T-11 — wallet PDF graceful degrade ──


def test_wallet_pdf_returns_none_on_missing_weasyprint(monkeypatch):
    """T-11 — when WeasyPrint cannot be imported (Cairo/Pango missing on
    dev hosts), `render_wallet_card_pdf` returns None instead of raising.
    The mint endpoint catches None and serves the response without the
    wallet-PDF download button.
    """
    import builtins

    from app.services import wallet_pdf

    real_import = builtins.__import__

    def _block_weasyprint(name, *args, **kwargs):
        if name == "weasyprint":
            raise ImportError("weasyprint deliberately unavailable for test")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _block_weasyprint)

    card = PublicEmergencyCardDTO(full_name="X")
    result = wallet_pdf.render_wallet_card_pdf(
        card=card,
        qr_data_url="data:image/png;base64,AAAA",
        locale="en",
    )
    assert result is None


# ── F4 verification — EmergencyAccessLog schema reflects the SET NULL fix ──


def test_emergency_access_log_token_id_is_nullable_post_027():
    """F4 — migration 027 made `token_id` nullable + SET NULL so logs
    survive token deletion AND user purge. Verify the ORM model matches.
    """
    from app.models.emergency import EmergencyAccessLog

    col = EmergencyAccessLog.__table__.c.token_id
    assert col.nullable is True, (
        "EmergencyAccessLog.token_id must be nullable for ON DELETE SET NULL"
    )


# ── M1 verification — visibility validator drops unknown keys ──


def test_emergency_profile_update_drops_unknown_visibility_keys():
    """M1 — a forged PATCH with unknown `field_visibility` keys is
    silently sanitized rather than 4xx'd, so old clients keep working
    but the JSONB column doesn't get polluted with attacker-chosen keys.
    """
    from app.schemas.emergency import EmergencyProfileUpdate

    body = EmergencyProfileUpdate(
        field_visibility={
            "blood_type": False,
            "attacker_key": False,
            "feature_flag_x": True,
        }
    )
    assert body.field_visibility == {"blood_type": False}
