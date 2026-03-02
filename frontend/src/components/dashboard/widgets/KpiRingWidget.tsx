import { KpiDonutChart } from "@/components/charts/KpiDonutChart";
import { getTranslations } from "next-intl/server";

export interface KpiData {
  caloriesBurned: { current: number; target: number };
  sleepScore: { current: number; target: number };
  heartRate: { current: number; target: number };
  steps: { current: number; target: number };
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

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_CONFIG.map(({ key, color }) => {
        const item = data[key];
        return (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2"
          >
            <KpiDonutChart
              value={item.current}
              target={item.target}
              color={color}
              size={96}
            />
            <div className="text-center">
              <p className="text-base font-bold text-foreground">
                {item.current.toLocaleString()}
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
