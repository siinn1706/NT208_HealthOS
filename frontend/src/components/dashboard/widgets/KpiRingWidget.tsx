import { KpiDonutChart } from "@/components/charts/KpiDonutChart";
import { getTranslations, getLocale } from "next-intl/server";
import { getLocaleTag } from "@/lib/format-utils";

export interface KpiData {
  caloriesBurned: { current: number | null; target: number | null };
  sleepScore: { current: number | null; target: number | null };
  heartRate: { current: number | null; target: number | null };
  steps: { current: number | null; target: number | null };
}

interface KpiRingWidgetProps {
  data: KpiData;
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

// Server Component — renders static KPI data as cards with client chart children
export async function KpiRingWidget({ data }: KpiRingWidgetProps) {
  const t = await getTranslations("dashboard.kpi");
  const locale = await getLocale();

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
              <div
                className="size-[96px] rounded-full border-[6px] border-muted/40"
                role="img"
                aria-label={t("noData")}
              />
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
