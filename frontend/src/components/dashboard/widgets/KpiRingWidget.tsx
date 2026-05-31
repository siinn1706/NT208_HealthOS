import { KpiDonutChart } from "@/components/charts/KpiDonutChart";
import { getTranslations, getLocale } from "next-intl/server";
import { getLocaleTag } from "@/lib/format-utils";
import type { DashboardSummary } from "@/lib/dashboard-data";
import type { DataSlice } from "@/types/data-slice";

export interface KpiData {
  caloriesBurned: { current: number | null; target: number | null };
  sleepScore: { current: number | null; target: number | null };
  heartRate: { current: number | null; target: number | null };
  steps: { current: number | null; target: number | null };
}

interface KpiRingWidgetProps {
  summary: DataSlice<DashboardSummary>;
}

const KPI_CONFIG = [
  {
    key: "caloriesBurned" as const,
    unitKey: "kcal",
    color: "#41BCE6",
  },
  {
    key: "sleepScore" as const,
    unitKey: "pts",
    color: "#E7DEA7",
  },
  {
    key: "heartRate" as const,
    unitKey: "bpm",
    color: "#E8BDB7",
  },
  {
    key: "steps" as const,
    unitKey: "steps",
    color: "#6DE7F7",
  },
];

const EMPTY_KPIS: KpiData = {
  caloriesBurned: { current: null, target: null },
  sleepScore: { current: null, target: null },
  heartRate: { current: null, target: null },
  steps: { current: null, target: null },
};

function summaryHasError(summary: DataSlice<DashboardSummary>): boolean {
  return summary.status === "recoverable_error" || summary.status === "hard_error" || summary.status === "no_permission";
}

// Server Component — renders static KPI data as cards with client chart children
export async function KpiRingWidget({ summary }: KpiRingWidgetProps) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.kpi"),
    getLocale(),
  ]);
  const data = summary.status === "success" && summary.data ? summary.data.kpis : EMPTY_KPIS;

  if (summaryHasError(summary)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-4">
        <p className="text-sm font-semibold text-foreground">{t("loadError")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.error?.message ?? t("noData")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_CONFIG.map(({ key, color }) => {
        const item = data[key];
        const chartTarget = item.target && item.target > 0 ? item.target : 100;
        const hasValue = typeof item.current === "number";
        return (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2"
          >
            {hasValue ? (
              <KpiDonutChart
                value={item.current as number}
                target={chartTarget}
                color={color}
                size={96}
              />
            ) : (
              // Empty ring instead of a deceptive 0 reading. Keeps the
              // KPI card layout stable while clearly signalling "no data".
              <>
                <div
                  className="size-[96px] rounded-full border-[6px] border-muted/40"
                  aria-hidden="true"
                />
                <span className="sr-only">{t("noData")}</span>
              </>
            )}
            <div className="text-center">
              <p className="text-base font-bold text-foreground">
                {hasValue ? (item.current as number).toLocaleString(getLocaleTag(locale)) : "--"}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">
                {t(key as Parameters<typeof t>[0])}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
