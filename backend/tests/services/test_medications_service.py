"""Unit tests for `app.services.medications` — focuses on the
deterministic helpers that don't touch the DB.

The DB-touching surface (create_plan, pause/resume, adherence aggregation,
import idempotency) is exercised by the manual smoke harness during
development; those paths require a live PostgreSQL fixture and live in the
integration-test layer once that infrastructure lands.
"""
from __future__ import annotations

import datetime
import uuid

import pytest

# `app.models.health_goal` registers a relationship target that
# `app.models.core.User` references by string. Importing it here forces the
# SQLAlchemy mapper to wire up before any test instantiates a model.
from app.models import health_goal  # noqa: F401
from app.models.core import (
    MedicationPlan,
    Reminder,
    ReminderRepeatEnum,
    ReminderTypeEnum,
)
from app.schemas.medications import (
    MedicationPlanCreateBody,
    _canonicalize_dose_times,
)
from app.services.medications import (
    _doses_per_day_for_plan,
    _infer_doses_per_day,
    _make_dedupe_key,
    _next_dose_at,
    _parse_duration_to_end_date,
    _refresh_refill_projection,
    _spread_default_times,
    _to_dto,
)


# ─────────────────────────────────────────────────────────────────────────────
# canonicalize / validation
# ─────────────────────────────────────────────────────────────────────────────


def test_canonicalize_dose_times_dedupes_and_sorts():
    assert _canonicalize_dose_times(["20:00", "08:00", "08:00"]) == ["08:00", "20:00"]


def test_canonicalize_dose_times_zero_pads():
    # Validator only normalises *valid* HH:MM input — it doesn't widen
    # truncated like "8:00". We assert the regex behaviour explicitly so
    # nobody silently relaxes it.
    with pytest.raises(ValueError):
        _canonicalize_dose_times(["8:00"])


def test_canonicalize_dose_times_rejects_garbage():
    with pytest.raises(ValueError):
        _canonicalize_dose_times(["08:00", "garbage"])


def test_canonicalize_dose_times_rejects_out_of_range():
    with pytest.raises(ValueError):
        _canonicalize_dose_times(["25:00"])


def test_create_body_rejects_end_before_start():
    with pytest.raises(ValueError):
        MedicationPlanCreateBody(
            name="X",
            dose_times=["08:00"],
            start_date=datetime.date(2026, 1, 5),
            end_date=datetime.date(2026, 1, 1),
        )


def test_create_body_rejects_unknown_form():
    with pytest.raises(ValueError):
        MedicationPlanCreateBody(
            name="X", dose_times=["08:00"], form="syrup"
        )


def test_create_body_rejects_unknown_repeat():
    with pytest.raises(ValueError):
        MedicationPlanCreateBody(
            name="X", dose_times=["08:00"], repeat="hourly"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Dose-time inference / spread
# ─────────────────────────────────────────────────────────────────────────────


def test_infer_doses_per_day_for_unknown_returns_one():
    assert _infer_doses_per_day(None) == 1
    assert _infer_doses_per_day("") == 1
    assert _infer_doses_per_day("when needed") == 1


@pytest.mark.parametrize(
    "freq, expected",
    [
        ("once daily", 1),
        ("1x daily", 1),
        ("twice a day", 2),
        ("2x daily", 2),
        ("BID", 2),
        ("3 times a day", 3),
        ("tid", 3),
        ("4 times daily", 4),
        ("QID", 4),
    ],
)
def test_infer_doses_per_day_known_phrases(freq, expected):
    assert _infer_doses_per_day(freq) == expected


def test_spread_default_times_one_dose():
    assert _spread_default_times(1) == ["08:00"]


def test_spread_default_times_two_doses():
    assert _spread_default_times(2) == ["08:00", "20:00"]


def test_spread_default_times_three_doses():
    assert _spread_default_times(3) == ["08:00", "14:00", "20:00"]


def test_spread_default_times_four_doses():
    assert _spread_default_times(4) == ["07:00", "13:00", "19:00", "22:00"]


def test_spread_default_times_unknown_falls_back_once_daily():
    # We only ship presets for 1-4. Anything outside (mis-classified) falls
    # back to a safe single dose so we never invent a multi-dose schedule
    # we can't justify.
    assert _spread_default_times(7) == ["08:00"]


# ─────────────────────────────────────────────────────────────────────────────
# Dedupe key
# ─────────────────────────────────────────────────────────────────────────────


def test_dedupe_key_is_stable_for_same_inputs():
    appt = uuid.uuid4()
    a = _make_dedupe_key(appt, 0, "Lisinopril")
    b = _make_dedupe_key(appt, 0, "Lisinopril")
    assert a == b


def test_dedupe_key_normalizes_case_and_whitespace():
    appt = uuid.uuid4()
    a = _make_dedupe_key(appt, 0, "Lisinopril")
    b = _make_dedupe_key(appt, 0, " LISINOPRIL ")
    assert a == b


def test_dedupe_key_distinct_per_index():
    appt = uuid.uuid4()
    assert _make_dedupe_key(appt, 0, "X") != _make_dedupe_key(appt, 1, "X")


# ─────────────────────────────────────────────────────────────────────────────
# Duration parsing
# ─────────────────────────────────────────────────────────────────────────────


def test_parse_duration_returns_none_for_blank():
    assert _parse_duration_to_end_date(None) is None
    assert _parse_duration_to_end_date("") is None
    assert _parse_duration_to_end_date("ongoing") is None


def test_parse_duration_days():
    today = datetime.date.today()
    end = _parse_duration_to_end_date("5 days")
    assert end == today + datetime.timedelta(days=4)


def test_parse_duration_weeks():
    today = datetime.date.today()
    end = _parse_duration_to_end_date("2 weeks")
    assert end == today + datetime.timedelta(days=2 * 7 - 1)


def test_parse_duration_vietnamese_days():
    today = datetime.date.today()
    end = _parse_duration_to_end_date("7 ngày")
    assert end == today + datetime.timedelta(days=6)


def test_parse_duration_rejects_implausible_window():
    # >2 years should be ignored, not turned into a wild end date.
    assert _parse_duration_to_end_date("9999 days") is None


# ─────────────────────────────────────────────────────────────────────────────
# Plan helpers (pure, no DB)
# ─────────────────────────────────────────────────────────────────────────────


def _make_reminder(
    *,
    repeat: ReminderRepeatEnum,
    is_active: bool = True,
    next_at: datetime.datetime | None = None,
    weekday_mask: int | None = None,
) -> Reminder:
    return Reminder(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        type=ReminderTypeEnum.MEDICINE,
        title="X",
        remind_time="08:00",
        repeat=repeat,
        done=False,
        tzid="Asia/Ho_Chi_Minh",
        time_of_day=datetime.time(8, 0),
        weekday_mask=weekday_mask,
        is_active=is_active,
        start_date=datetime.date.today(),
        next_occurrence_at=next_at,
    )


def test_doses_per_day_amortizes_weekly():
    # Review H7 fix — weekly with mask=0 (legacy lenience = "every day") is
    # 1.0/day; explicit Mon+Thu mask (bits 0+3 = 9) is 2/7 ≈ 0.286/day.
    rems = [
        _make_reminder(repeat=ReminderRepeatEnum.DAILY),
        _make_reminder(repeat=ReminderRepeatEnum.DAILY),
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, is_active=False),
        _make_reminder(repeat=ReminderRepeatEnum.WEEKLY, weekday_mask=0),
    ]
    # 2 active daily (2.0) + 1 weekly with legacy 0-mask (1.0) = 3.0.
    assert _doses_per_day_for_plan(rems) == pytest.approx(3.0)


def test_doses_per_day_weekly_with_mask():
    # Two-day-per-week schedule: Mon+Thu (mask = 0b0001001 = 9) → 2/7.
    rems = [_make_reminder(repeat=ReminderRepeatEnum.WEEKLY, weekday_mask=9)]
    assert _doses_per_day_for_plan(rems) == pytest.approx(2 / 7)


def test_doses_per_day_returns_zero_when_no_active_rate():
    # Empty list and inactive-only lists return 0.0 (refill projection then
    # skips). Old behavior floored to 1 — that masked the bug where weekly
    # plans were dramatically over-projected.
    assert _doses_per_day_for_plan([]) == 0.0
    assert _doses_per_day_for_plan(
        [_make_reminder(repeat=ReminderRepeatEnum.DAILY, is_active=False)]
    ) == 0.0
    # `once` reminders deliberately contribute 0 — refill projection has no
    # meaning for one-shot doses.
    assert _doses_per_day_for_plan(
        [_make_reminder(repeat=ReminderRepeatEnum.ONCE)]
    ) == 0.0


def test_doses_per_day_amortizes_monthly():
    # Monthly contributes 1/30 ≈ 0.033 per active reminder.
    rems = [_make_reminder(repeat=ReminderRepeatEnum.MONTHLY)]
    assert _doses_per_day_for_plan(rems) == pytest.approx(1 / 30)


def test_next_dose_at_picks_earliest_pending():
    t1 = datetime.datetime(2026, 4, 19, 8, 0, tzinfo=datetime.timezone.utc)
    t2 = datetime.datetime(2026, 4, 19, 12, 0, tzinfo=datetime.timezone.utc)
    rems = [
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, next_at=t2),
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, next_at=t1),
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, next_at=None),
    ]
    assert _next_dose_at(rems) == t1


def test_next_dose_at_returns_none_when_no_pending():
    rems = [_make_reminder(repeat=ReminderRepeatEnum.DAILY, next_at=None)]
    assert _next_dose_at(rems) is None


def _make_plan(
    *,
    supply: int | None = None,
    last_refill: datetime.datetime | None = None,
) -> MedicationPlan:
    return MedicationPlan(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        name="X",
        start_date=datetime.date.today(),
        status="active",
        tzid="Asia/Ho_Chi_Minh",
        refill_supply_units=supply,
        last_refill_at=last_refill,
    )


def test_to_dto_carries_dose_count_and_next_dose():
    plan = _make_plan()
    rems = [
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, is_active=True),
        _make_reminder(repeat=ReminderRepeatEnum.DAILY, is_active=False),
    ]
    dto = _to_dto(plan, rems)
    assert dto.dose_count == 1, "inactive reminders shouldn't count toward dose_count"
    assert dto.status == "active"
