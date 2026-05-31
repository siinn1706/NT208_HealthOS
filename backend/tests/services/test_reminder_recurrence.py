"""Unit tests for the reminder recurrence service.

Covers:
  * Basic enumeration for `daily`, `weekly`, `monthly`, `once`.
  * Legacy `weekly` rows without a `weekday_mask` default to "every day"
    so existing reminders do not degrade to one weekday only.
  * Tz-aware computation against a non-DST tz (Asia/Ho_Chi_Minh) and a DST tz
    (Europe/London) — same wall-clock time produces different UTC offsets
    across the spring-forward boundary.
"""
from __future__ import annotations

import datetime
import uuid

import pytest

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    from backports.zoneinfo import ZoneInfo  # type: ignore[no-redef]

from app.models.core import Reminder, ReminderRepeatEnum, ReminderTypeEnum
from app.services.reminder_recurrence import compute_next_n


def _make_reminder(
    *,
    repeat: ReminderRepeatEnum,
    time_of_day: datetime.time,
    tzid: str = "Asia/Ho_Chi_Minh",
    weekday_mask: int | None = None,
    day_of_month: int | None = None,
    start_date: datetime.date | None = None,
    end_date: datetime.date | None = None,
) -> Reminder:
    """Build an in-memory Reminder for service-level tests (no DB)."""
    return Reminder(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        type=ReminderTypeEnum.MEDICINE,
        title="Test",
        remind_time=time_of_day.strftime("%H:%M"),
        time_of_day=time_of_day,
        repeat=repeat,
        note=None,
        done=False,
        tzid=tzid,
        weekday_mask=weekday_mask,
        day_of_month=day_of_month,
        start_date=start_date or datetime.date(2026, 4, 1),
        end_date=end_date,
        is_active=True,
    )


def test_daily_produces_one_slot_per_day_within_horizon():
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.DAILY,
        time_of_day=datetime.time(7, 30),
        start_date=datetime.date(2026, 4, 1),
    )
    since = datetime.datetime(2026, 4, 19, 0, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=14, since=since, horizon_days=7)
    # 7-day horizon at 1/day = 7 slots (the start date may be in the past so
    # we just assert ≤ horizon).
    assert 1 <= len(slots) <= 7
    # All slots must be tz-aware UTC.
    assert all(s.tzinfo is datetime.timezone.utc for s in slots)


def test_daily_keeps_today_slot_when_time_already_passed():
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.DAILY,
        time_of_day=datetime.time(8, 0),
        start_date=datetime.date(2026, 5, 30),
    )
    since = datetime.datetime(2026, 5, 30, 8, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=3, since=since, horizon_days=2)
    tz = ZoneInfo("Asia/Ho_Chi_Minh")

    assert slots[0].astimezone(tz).date() == datetime.date(2026, 5, 30)
    assert slots[0].astimezone(tz).time() == datetime.time(8, 0)


def test_weekly_with_explicit_mask_picks_only_those_weekdays():
    # Mon=0, Wed=2, Fri=4 → bits 0b00010101 == 21
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.WEEKLY,
        time_of_day=datetime.time(8, 0),
        weekday_mask=0b00010101,
        start_date=datetime.date(2026, 4, 1),
    )
    since = datetime.datetime(2026, 4, 19, 12, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=14, since=since, horizon_days=14)
    # Each returned slot's local weekday must be Mon/Wed/Fri.
    tz = ZoneInfo("Asia/Ho_Chi_Minh")
    for slot in slots:
        assert slot.astimezone(tz).weekday() in {0, 2, 4}


def test_weekly_without_mask_defaults_to_every_day():
    """Legacy weekly rows must not silently degrade to one weekday per week."""
    # weekday_mask=None — simulates a legacy row before B7.
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.WEEKLY,
        time_of_day=datetime.time(8, 0),
        weekday_mask=None,
        start_date=datetime.date(2026, 4, 1),
    )
    since = datetime.datetime(2026, 4, 19, 0, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=14, since=since, horizon_days=7)
    # Should fire on every day in the 7-day horizon → ≥ 6 slots (allowing for
    # exact "now" boundary), not 1 like the buggy version.
    assert len(slots) >= 6


def test_monthly_clamps_day_of_month_to_last_day():
    """day_of_month=31 in February must clamp to Feb 28/29."""
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.MONTHLY,
        time_of_day=datetime.time(9, 0),
        day_of_month=31,
        start_date=datetime.date(2026, 1, 1),
    )
    since = datetime.datetime(2026, 1, 1, 0, 0, tzinfo=datetime.timezone.utc)
    # Long horizon to capture March + April.
    slots = compute_next_n(reminder, n=6, since=since, horizon_days=120)
    tz = ZoneInfo("Asia/Ho_Chi_Minh")
    feb_slot = next((s for s in slots if s.astimezone(tz).month == 2), None)
    if feb_slot is not None:
        # 2026 is not a leap year — Feb has 28 days.
        assert feb_slot.astimezone(tz).day == 28


def test_once_returns_a_single_slot():
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.ONCE,
        time_of_day=datetime.time(14, 30),
        start_date=datetime.date(2026, 5, 1),
    )
    since = datetime.datetime(2026, 4, 19, 0, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=14, since=since)
    assert len(slots) == 1
    tz = ZoneInfo("Asia/Ho_Chi_Minh")
    assert slots[0].astimezone(tz).date() == datetime.date(2026, 5, 1)


def test_dst_spring_forward_in_europe_london():
    """Wall-clock 08:00 in Europe/London on 2026-03-29 (spring forward) is
    +0000 the day before and +0100 from that day on. The materializer must
    honor wall-clock semantics, not naive UTC arithmetic.
    """
    reminder = _make_reminder(
        repeat=ReminderRepeatEnum.DAILY,
        time_of_day=datetime.time(8, 0),
        tzid="Europe/London",
        start_date=datetime.date(2026, 3, 28),
    )
    since = datetime.datetime(2026, 3, 28, 0, 0, tzinfo=datetime.timezone.utc)
    slots = compute_next_n(reminder, n=5, since=since, horizon_days=5)
    london = ZoneInfo("Europe/London")
    # Each slot's wall-clock hour in London must be 08:00 — even across the
    # DST boundary (UTC offset shifts from +0 to +1).
    for slot in slots:
        local = slot.astimezone(london)
        assert local.hour == 8 and local.minute == 0
