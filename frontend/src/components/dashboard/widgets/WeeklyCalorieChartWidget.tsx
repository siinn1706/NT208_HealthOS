"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { WeeklyCaloriePoint } from "@/types/api";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import type { ReportPeriod } from "@/types/api";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper").then((m) => m.EChartWrapper),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> }
);

const DAILY_CALORIE_TARGET = 2000;

async function fetchMealCalories(days: number): Promise<WeeklyCaloriePoint[]> {
  const res = await fetch(`/api/v1/analytics/meal-calories?days=${days}&target=${DAILY_CALORIE_TARGET}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
  const data: Array<{ date: string; value: number; target: number; progress_percent?: number }> = json?.data ?? [];
  return data.map((d) => {
    const dateObj = new Date(d.date);
    return {
      date: `${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`,
      full_date: d.date,
      calories: d.value,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      target: d.target,
    };
  });
}

interface WeeklyCalorieChartWidgetProps {
  /** Pre-fetched data (used by meals page) */
  data?: WeeklyCaloriePoint[];
  /** Initial data with period (used by dashboard page) */
  initialData?: WeeklyCaloriePoint[];
  initialPeriod?: ReportPeriod;
}

export function WeeklyCalorieChartWidget({
  data: staticData,
  initialData = [],
  initialPeriod = "7d",
}: WeeklyCalorieChartWidgetProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [chartData, setChartData] = useState<WeeklyCaloriePoint[]>(staticData ?? initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    const d = newPeriod === "7d" ? 7 : newPeriod === "30d" ? 30 : 90;
    startTransition(async () => {
      const fresh = await fetchMealCalories(d);
      setChartData(fresh);
    });
  };

  const displayData = staticData ?? chartData;
  const hasData = displayData.some((d) => d.calories > 0);

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15,39,67,0.9)",
      borderColor: "rgba(65,188,230,0.3)",
      borderWidth: 1,
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const p = params as Array<{ value: number; seriesName: string; name: string }>;
        const calories = p.find((x) => x.seriesName === "Calories")?.value ?? 0;
        return `
          <div style="padding:4px 6px">
            <div style="font-weight:600;margin-bottom:4px">${p[0]?.name ?? ""}</div>
            <div>Calories: <b>${calories} kcal</b></div>
            <div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.15);padding-top:4px">
              Mục tiêu: <b>${DAILY_CALORIE_TARGET} kcal</b>
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: ["Calories"],
      bottom: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      icon: "roundRect",
    },
    grid: {
      top: 16,
      left: 40,
      right: 10,
      bottom: 40,
    },
    xAxis: {
      type: "category",
      data: displayData.map((d) => d.date),
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.3)" } },
      splitLine: { show: false },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
      min: 0,
    },
    series: [
      {
        name: "Calories",
        type: "bar",
        barMaxWidth: 32,
        itemStyle: {
          color: "#41BCE6",
          borderRadius: [4, 4, 0, 0],
        },
        data: displayData.map((d) => d.calories),
        emphasis: { focus: "series" },
      },
      {
        name: "Mục tiêu",
        type: "line",
        data: displayData.map(() => DAILY_CALORIE_TARGET),
        symbol: "none",
        lineStyle: { type: "dashed", color: "#f59e0b", width: 1.5 },
        itemStyle: { color: "#f59e0b" },
        tooltip: { show: false },
        z: 10,
      },
    ],
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">7 ngày qua</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Lượng calories theo ngày</p>
        </div>
        <div className="flex items-center gap-3">
          {staticData === undefined && (
            <TimeRangeSelector value={period} onChange={handlePeriodChange} />
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
            <span className="inline-block w-5 border-t-2 border-dashed border-amber-500" />
            Mục tiêu {DAILY_CALORIE_TARGET} kcal
          </div>
        </div>
      </div>
      {isPending ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          Đang tải...
        </div>
      ) : !hasData ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          Chưa có thông tin
        </div>
      ) : (
        <EChartWrapper option={option} style={{ height: "220px" }} />
      )}
    </div>
  );
}
