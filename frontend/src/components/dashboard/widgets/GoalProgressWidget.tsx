import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";
import { getLocaleTag, getUnitLabel } from "@/lib/format-utils";
import type { DashboardSummary } from "@/lib/dashboard-data";
import type { DataSlice } from "@/types/data-slice";

export interface Goal {
  id: string;
  key: "water" | "steps" | "calories";
  current: number | null;
  target: number | null;
  unit: string;
}

interface GoalProgressWidgetProps {
  summary: DataSlice<DashboardSummary>;
}

const GOAL_COLORS: Record<Goal["key"], string> = {
  water: "#41BCE6",
  steps: "#6DE7F7",
  calories: "#E3B79A",
};

function summaryHasError(summary: DataSlice<DashboardSummary>): boolean {
  return summary.status === "recoverable_error" || summary.status === "hard_error" || summary.status === "no_permission";
}

// Server Component
export async function GoalProgressWidget({ summary }: GoalProgressWidgetProps) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.goals"),
    getLocale(),
  ]);
  const goals = summary.status === "success" && summary.data ? summary.data.goals : [];

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{t("title")}</p>
        <Target className="size-4 text-muted-foreground" />
      </div>

      <div className="px-5 py-4 space-y-5">
        {summaryHasError(summary) ? (
          <p className="text-xs text-muted-foreground">
            {summary.error?.message ?? t("loadError")}
          </p>
        ) : goals.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("noInfo")}</p>
        )}
        {!summaryHasError(summary) && goals.map((goal) => {
          const safeCurrent = goal.current ?? 0;
          const safeTarget = goal.target && goal.target > 0 ? goal.target : null;
          const pct = safeTarget ? Math.min(Math.round((safeCurrent / safeTarget) * 100), 100) : 0;
          const color = GOAL_COLORS[goal.key];
          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">
                  {t(goal.key as Parameters<typeof t>[0])}
                </span>
                <span className="text-xs text-muted-foreground">
                  {goal.current == null ? "--" : goal.current.toLocaleString(getLocaleTag(locale))}{" / "}{goal.target == null ? "--" : goal.target.toLocaleString(getLocaleTag(locale))} {goal.unit ? getUnitLabel(goal.unit, locale) : "--"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <progress
                  className="sr-only"
                  value={pct}
                  max={100}
                  aria-label={t(goal.key as Parameters<typeof t>[0])}
                />
                <div
                  className="h-2 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}

        <Link
          href={`/${locale}/dashboard/progress`}
          className={cn(
            "inline-flex items-center text-xs font-medium text-primary",
            "hover:underline transition-colors duration-200"
          )}
        >
          {t("viewAll")} →
        </Link>
      </div>
    </div>
  );
}
