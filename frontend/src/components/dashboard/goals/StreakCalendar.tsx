"use client";

"use client";

import { cn } from "@/lib/utils";
import type { UserStreakEntry } from "@/data/gamification";
import { useTranslations, useLocale } from "next-intl";

interface StreakCalendarProps {
  history: UserStreakEntry[];
  currentStreak: number;
  longestStreak: number;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Generate locale-aware short day labels
function getDayLabels(locale: string): string[] {
  // Monday = 1, Sunday = 0 (ISO week)
  const monday = new Date(2024, 0, 1); // Jan 1, 2024 is Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86400000).toLocaleDateString(locale, { weekday: "short" })
  );
}

function getCellColor(entry: UserStreakEntry | undefined): string {
  if (!entry) return "bg-muted/30";
  if (!entry.completed) return "bg-muted/50";
  const n = entry.activitiesCount;
  if (n >= 4) return "bg-[#41BCE6]";
  if (n === 3) return "bg-[#41BCE6]/75";
  if (n === 2) return "bg-[#41BCE6]/50";
  return "bg-[#41BCE6]/30";
}

export function StreakCalendar({
  history,
  currentStreak,
  longestStreak,
}: StreakCalendarProps) {
  const t = useTranslations("dashboard.progress");
  const locale = useLocale();

  // Build 8×7 grid (56 cells, oldest first)
  const cells: (UserStreakEntry | undefined)[] = Array.from(
    { length: 56 },
    (_, i) => history[i]
  );

  // Split into 8 weeks
  const weeks: (UserStreakEntry | undefined)[][] = Array.from(
    { length: 8 },
    (_, w) => cells.slice(w * 7, w * 7 + 7)
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-foreground">{t("streakCalendar.title")}</p>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#41BCE6]" />
            <span className="text-muted-foreground">{t("streakCalendar.active")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted/50" />
            <span className="text-muted-foreground">{t("streakCalendar.rest")}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { labelKey: "currentStreak" as const, value: `${currentStreak} ${t("streakCalendar.days")}`, color: "#41BCE6" },
          { labelKey: "longestStreak" as const, value: `${longestStreak} ${t("streakCalendar.days")}`, color: "#6DE7F7" },
          {
            labelKey: "pastWeeks" as const,
            value: `${history.filter((e) => e.completed).length} ${t("streakCalendar.days")}`,
            color: "#A78BFA",
          },
        ].map(({ labelKey, value, color }) => (
          <div
            key={labelKey}
            className="rounded-lg bg-muted/40 px-3 py-2.5 text-center"
          >
            <p className="text-sm font-bold" style={{ color }}>
              {value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t(`streakCalendar.${labelKey}`)}</p>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {getDayLabels(locale).map((d) => (
              <div
                key={d}
                className="text-center text-[10px] text-muted-foreground font-medium"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Week rows */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((entry, di) => (
                  <div
                    key={di}
                    title={
                      entry
                        ? `${entry.date}: ${entry.completed ? t("streakCalendar.activitiesCount", { n: entry.activitiesCount }) : t("streakCalendar.rest")}`
                        : ""
                    }
                    className={cn(
                      "h-7 rounded-md transition-all duration-200 cursor-default",
                      getCellColor(entry),
                      entry?.completed && "hover:scale-110 hover:shadow-sm"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Week requirement note */}
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Cần ≥ 5 ngày/tuần × 4 tuần để nhận huy hiệu
          </p>
        </div>
      </div>
    </div>
  );
}
