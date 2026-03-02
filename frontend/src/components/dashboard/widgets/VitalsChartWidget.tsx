import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { VitalsLineChart } from "@/components/charts/VitalsLineChart";
import type { VitalsDataPoint } from "@/components/charts/VitalsLineChart";

interface VitalsChartWidgetProps {
  data: VitalsDataPoint[];
}

// Server Component — passes static data to Client chart
export async function VitalsChartWidget({ data }: VitalsChartWidgetProps) {
  const t = await getTranslations("dashboard.vitals");

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Activity className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <VitalsLineChart
            data={data}
            labels={{
              heartRate: t("heartRate"),
              systolic: t("bloodPressureSys"),
              diastolic: t("bloodPressureDia"),
            }}
            height={260}
          />
        )}
      </div>
    </div>
  );
}
