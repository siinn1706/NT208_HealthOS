"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { WeeklyCaloriePoint } from "@/types/api";

const EChartWrapper = dynamic(
  () =>
    import("@/components/charts/EChartWrapper").then((m) => m.EChartWrapper),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> }
);

const DAILY_CALORIE_TARGET = 2000;

interface WeeklyCalorieChartWidgetProps {
  data: WeeklyCaloriePoint[];
}

export function WeeklyCalorieChartWidget({ data }: WeeklyCalorieChartWidgetProps) {
  const days = data.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
  });

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
        const total = p.reduce((s, x) => s + (x.value ?? 0), 0);
        return `
          <div style="padding:4px 6px">
            <div style="font-weight:600;margin-bottom:4px">${p[0]?.name ?? ""}</div>
            ${p.map((x) => `<div>${x.seriesName}: <b>${x.value}g</b></div>`).join("")}
            <div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.15);padding-top:4px">
              Tổng: <b>${total} kcal</b>
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: ["Protein", "Carbs", "Chất béo"],
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
      data: days,
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
        name: "Protein",
        type: "bar",
        stack: "nutrition",
        barMaxWidth: 32,
        itemStyle: {
          color: "#41BCE6",
          borderRadius: [0, 0, 0, 0],
        },
        data: data.map((d) => d.protein_g),
        emphasis: { focus: "series" },
      },
      {
        name: "Carbs",
        type: "bar",
        stack: "nutrition",
        itemStyle: { color: "#E7DEA7", borderRadius: [0, 0, 0, 0] },
        data: data.map((d) => d.carbs_g),
        emphasis: { focus: "series" },
      },
      {
        name: "Chất béo",
        type: "bar",
        stack: "nutrition",
        itemStyle: { color: "#E3B79A", borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.fat_g),
        emphasis: { focus: "series" },
      },
      {
        name: "Mục tiêu",
        type: "line",
        data: data.map(() => DAILY_CALORIE_TARGET),
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
          <p className="text-xs text-muted-foreground mt-0.5">Lượng dinh dưỡng theo ngày</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
          <span className="inline-block w-5 border-t-2 border-dashed border-amber-500" />
          Mục tiêu 2000 kcal
        </div>
      </div>
      <EChartWrapper option={option} style={{ height: "220px" }} />
    </div>
  );
}
