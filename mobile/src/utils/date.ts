import dayjs from "dayjs";

export function formatDate(value: string | Date | undefined | null, fmt = "MMM D, YYYY"): string {
  if (!value) return "";
  return dayjs(value).format(fmt);
}

export function formatTime(value: string | Date | undefined | null, fmt = "HH:mm"): string {
  if (!value) return "";
  return dayjs(value).format(fmt);
}

export function relative(value: string | Date | undefined | null): string {
  if (!value) return "";
  const d = dayjs(value);
  const now = dayjs();
  const diffSec = now.diff(d, "second");
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.format("MMM D");
}

export function todayBounds(): { start: string; end: string } {
  const start = dayjs().startOf("day").toISOString();
  const end = dayjs().endOf("day").toISOString();
  return { start, end };
}
