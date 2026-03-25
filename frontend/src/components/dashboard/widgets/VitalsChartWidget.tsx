"use client";

import { useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { VitalsLineChart } from "@/components/charts/VitalsLineChart";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import type { ReportPeriod } from "@/types/api";
import type { VitalsDataPoint } from "@/components/charts/VitalsLineChart";

async function fetchVitalsData(period: ReportPeriod): Promise<VitalsDataPoint[]> {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const res = await fetch(`/api/v1/vitals/timeseries?days=${days}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
  const data: Array<{
    date: string;
    heart_rate?: number;
    systolic?: number;
    diastolic?: number;
  }> = json?.data ?? [];
  return data.map((row) => ({
    date: row.date,
    heartRate: row.heart_rate,
    systolic: row.systolic,
    diastolic: row.diastolic,
  }));
}

interface VitalsChartWidgetProps {
  initialData: VitalsDataPoint[];
  initialPeriod?: ReportPeriod;
}

export function VitalsChartWidget({
  initialData,
  initialPeriod = "7d",
}: VitalsChartWidgetProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [data, setData] = useState<VitalsDataPoint[]>(initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    startTransition(async () => {
      const fresh = await fetchVitalsData(newPeriod);
      setData(fresh);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">Nhịp tim & Huyết áp</p>
          <p className="text-[11px] text-muted-foreground">Dữ liệu vitals theo thời gian</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={period} onChange={handlePeriodChange} />
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div className="p-4">
        {isPending ? (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            Đang tải...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <VitalsLineChart
            data={data}
            labels={{
              heartRate: "Nhịp tim",
              systolic: "Huyết áp tâm thu",
              diastolic: "Huyết áp tâm trương",
            }}
            height={260}
          />
        )}
      </div>
    </div>
  );
}
