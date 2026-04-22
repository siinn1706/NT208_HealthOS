import dayjs from "dayjs";

export function formatDate(value: string | Date | undefined | null, fmt = "MMM D, YYYY"): string {
  if (!value) return "";
  return dayjs(value).format(fmt);
}

export function formatTime(value: string | Date | undefined | null, fmt = "HH:mm"): string {
  if (!value) return "";
  return dayjs(value).format(fmt);
}

/** Optional localized labels for `relative()`. When omitted, English bucket strings are used (backward compatible). */
export interface RelativeTimeLabels {
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  /** Last resort for messages older than ~7 days (e.g. short month + day in the active locale). */
  olderThanOneWeek: (iso: string) => string;
}

export function relative(
  value: string | Date | undefined | null,
  labels?: RelativeTimeLabels
): string {
  if (!value) return "";
  const d = dayjs(value);
  const now = dayjs();
  const diffSec = now.diff(d, "second");
  const iso = typeof value === "string" ? value : value.toISOString();

  if (!labels) {
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.format("MMM D");
  }

  if (diffSec < 60) return labels.justNow;
  if (diffSec < 3600) return labels.minutesAgo(Math.floor(diffSec / 60));
  if (diffSec < 86400) return labels.hoursAgo(Math.floor(diffSec / 3600));
  if (diffSec < 86400 * 7) return labels.daysAgo(Math.floor(diffSec / 86400));
  return labels.olderThanOneWeek(iso);
}

export function todayBounds(): { start: string; end: string } {
  const start = dayjs().startOf("day").toISOString();
  const end = dayjs().endOf("day").toISOString();
  return { start, end };
}
