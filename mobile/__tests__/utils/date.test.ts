import { formatDate, formatTime, relative, todayBounds } from "@/utils/date";

describe("date helpers", () => {
  it("formats a known date", () => {
    expect(formatDate("2026-04-19T14:30:00Z", "YYYY-MM-DD")).toBe("2026-04-19");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatTime(null)).toBe("");
  });

  it("formatTime defaults to HH:mm", () => {
    const t = formatTime("2026-04-19T08:05:00Z");
    expect(t).toMatch(/^\d{2}:\d{2}$/);
  });

  it("relative collapses recent dates to friendly bucket", () => {
    const now = new Date();
    expect(relative(new Date(now.getTime() - 30_000).toISOString())).toBe("just now");
    expect(relative(new Date(now.getTime() - 5 * 60_000).toISOString())).toBe("5m ago");
    expect(relative(new Date(now.getTime() - 2 * 3600_000).toISOString())).toBe("2h ago");
    expect(relative(new Date(now.getTime() - 3 * 86400_000).toISOString())).toBe("3d ago");
  });

  it("todayBounds returns local-day boundaries roughly 24h apart", () => {
    const { start, end } = todayBounds();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    expect(endMs).toBeGreaterThan(startMs);
    // Within a 24-hour window (allow slack for tz quirks during the test run)
    const diffH = (endMs - startMs) / (3600 * 1000);
    expect(diffH).toBeGreaterThan(23.5);
    expect(diffH).toBeLessThan(24.5);
  });
});
