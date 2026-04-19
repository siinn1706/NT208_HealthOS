"""B7 P5 — recurrence subset that matches the current Reminders UI.

Intentionally NOT a full RFC 5545 RRULE engine. The UI today ships four repeat
modes (`once`, `daily`, `weekly`, `monthly`) — we model exactly those, plus
weekday bitmap (weekly) and day-of-month (monthly). DST handled by anchoring
all wall-clock arithmetic in the user's `tzid` and converting to UTC for storage.

Future expansion: swap `compute_next_n` for `dateutil.rrule` if the UI grows
to expose interval/count/byweekno/etc. Existing callers consume `list[datetime]`
so the boundary stays stable.
"""
from __future__ import annotations

import datetime
import logging
from typing import Iterable, Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover — Python < 3.9 not supported by this repo.
    from backports.zoneinfo import ZoneInfo  # type: ignore[no-redef]

from app.models.core import Reminder, ReminderRepeatEnum

logger = logging.getLogger(__name__)


DEFAULT_TZID = "Asia/Ho_Chi_Minh"
HORIZON_DAYS = 7
DEFAULT_MAX_OCCURRENCES = 14


def _resolve_tz(tzid: Optional[str]) -> ZoneInfo:
    name = tzid or DEFAULT_TZID
    try:
        return ZoneInfo(name)
    except Exception:
        logger.warning("Unknown tzid %r, falling back to %s", tzid, DEFAULT_TZID)
        return ZoneInfo(DEFAULT_TZID)


def _resolve_time(reminder: Reminder) -> datetime.time:
    if reminder.time_of_day is not None:
        return reminder.time_of_day
    raw = (reminder.remind_time or "").strip()
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.datetime.strptime(raw, fmt).time()
        except ValueError:
            continue
    return datetime.time(8, 0)


def _bits_to_weekdays(mask: Optional[int]) -> set[int]:
    """Bit 0 = Mon … bit 6 = Sun. Returns an empty set if mask is unset."""
    if mask is None or mask <= 0:
        return set()
    return {i for i in range(7) if (mask >> i) & 1}


def _localized_at(date: datetime.date, time: datetime.time, tz: ZoneInfo) -> datetime.datetime:
    """Wall-clock instant in `tz`, returned as a tz-aware datetime."""
    return datetime.datetime.combine(date, time, tzinfo=tz)


def _to_utc(dt: datetime.datetime) -> datetime.datetime:
    return dt.astimezone(datetime.timezone.utc)


def compute_next_n(
    reminder: Reminder,
    *,
    n: int = DEFAULT_MAX_OCCURRENCES,
    since: Optional[datetime.datetime] = None,
    horizon_days: int = HORIZON_DAYS,
) -> list[datetime.datetime]:
    """Generate up to `n` upcoming occurrences in UTC, capped by `horizon_days`.

    The horizon keeps materialization cheap — we only ever store the next
    week's worth of slots and let the beat task top them up.
    """
    tz = _resolve_tz(reminder.tzid)
    now_utc = since or datetime.datetime.now(datetime.timezone.utc)
    now_local = now_utc.astimezone(tz)
    horizon_utc = now_utc + datetime.timedelta(days=horizon_days)
    end_date = (reminder.end_date or horizon_utc.date()) if reminder.end_date else horizon_utc.date()

    time = _resolve_time(reminder)
    repeat = reminder.repeat
    out: list[datetime.datetime] = []
    start_date = reminder.start_date or now_local.date()

    if repeat == ReminderRepeatEnum.ONCE:
        # `once` fires on its `start_date` at `time_of_day` — past-due slots
        # remain pending so the user can still mark them done.
        scheduled_local = _localized_at(start_date, time, tz)
        out.append(_to_utc(scheduled_local))
        return out

    if repeat == ReminderRepeatEnum.DAILY:
        cursor = max(now_local.date(), start_date)
        while len(out) < n and cursor <= end_date:
            scheduled_local = _localized_at(cursor, time, tz)
            scheduled_utc = _to_utc(scheduled_local)
            if scheduled_utc <= horizon_utc and scheduled_utc >= now_utc - datetime.timedelta(minutes=1):
                out.append(scheduled_utc)
            cursor += datetime.timedelta(days=1)
        return out

    if repeat == ReminderRepeatEnum.WEEKLY:
        weekdays = _bits_to_weekdays(reminder.weekday_mask)
        if not weekdays:
            # B7 review P2-2 — legacy `repeat='weekly'` rows had no weekday
            # bitmap; the original semantics were ambiguous but conservative
            # users expected "every day of the week" rather than "one
            # specific weekday derived from start_date" (which would silently
            # cut their meds notifications by 6/7). Default to the full set
            # so legacy reminders keep firing as often as before; the new
            # FE form requires an explicit mask for new weekly rows.
            weekdays = {0, 1, 2, 3, 4, 5, 6}
        cursor = max(now_local.date(), start_date)
        while len(out) < n and cursor <= end_date:
            if cursor.weekday() in weekdays:
                scheduled_local = _localized_at(cursor, time, tz)
                scheduled_utc = _to_utc(scheduled_local)
                if scheduled_utc <= horizon_utc and scheduled_utc >= now_utc - datetime.timedelta(minutes=1):
                    out.append(scheduled_utc)
            cursor += datetime.timedelta(days=1)
        return out

    if repeat == ReminderRepeatEnum.MONTHLY:
        # Anchor on day_of_month or fall back to start_date's day.
        target_dom = reminder.day_of_month or start_date.day
        cursor_year, cursor_month = now_local.year, now_local.month
        while len(out) < n:
            try:
                # Clamp -1 / 31+ to last day of month.
                last_day = _last_day_of_month(cursor_year, cursor_month)
                day = last_day if target_dom < 0 or target_dom > last_day else target_dom
                day_date = datetime.date(cursor_year, cursor_month, day)
            except ValueError:
                # Should not happen with the clamp above, but guard anyway.
                day_date = datetime.date(cursor_year, cursor_month, 1)
            if day_date > end_date:
                break
            scheduled_local = _localized_at(day_date, time, tz)
            scheduled_utc = _to_utc(scheduled_local)
            if scheduled_utc <= horizon_utc and scheduled_utc >= now_utc - datetime.timedelta(minutes=1):
                out.append(scheduled_utc)
            # Advance to next month.
            if cursor_month == 12:
                cursor_year += 1
                cursor_month = 1
            else:
                cursor_month += 1
        return out

    return out


def _last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        next_first = datetime.date(year + 1, 1, 1)
    else:
        next_first = datetime.date(year, month + 1, 1)
    last = next_first - datetime.timedelta(days=1)
    return last.day


def derive_next_occurrence_at(
    reminder: Reminder,
    *,
    now: Optional[datetime.datetime] = None,
) -> Optional[datetime.datetime]:
    """Convenience: first slot from `compute_next_n` (or None when none)."""
    slots = compute_next_n(reminder, n=1, since=now)
    return slots[0] if slots else None


def reminder_today_window(tzid: str, now: Optional[datetime.datetime] = None) -> tuple[datetime.datetime, datetime.datetime]:
    """[start_of_today_in_tz, end_of_today_in_tz] as UTC datetimes — used by
    the FE "today" tab and by the materializer's filter."""
    tz = _resolve_tz(tzid)
    now_local = (now or datetime.datetime.now(datetime.timezone.utc)).astimezone(tz)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + datetime.timedelta(days=1)
    return _to_utc(start_local), _to_utc(end_local)
