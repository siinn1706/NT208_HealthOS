"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption } from "echarts";

interface PeriodComparisonChartProps {
  currentLabel: string;
  currentData: number[];
  previousData: number[];
  dates: string[];
  unit: string;
  height?: number;
}

const COLORS = {
  current: "#41BCE6",
  previous: "rgba(65,188,230,0.35)",
};

export function PeriodComparisonChart({
  currentLabel,
  currentData,
  previousData,
  dates,
  unit,
  height = 260,
}: PeriodComparisonChartProps) {
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "var(--color-card)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number; seriesName: string }>;
        return p.map((s) => `${s.seriesName}: ${s.value} ${unit}`).join("<br/>");
      },
    },
    legend: {
      bottom: 0,
      left: "center",
      textStyle: { color: "var(--color-muted-foreground)", fontSize: 11 },
    },
    grid: { top: 8, left: 12, right: 12, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: dates,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "var(--color-border)", type: "dashed" } },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 11 },
    },
    series: [
      {
        name: `Kỳ hiện tại (${currentLabel})`,
        type: "bar",
        data: currentData,
        itemStyle: { color: COLORS.current, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12,
      },
      {
        name: "Kỳ trước",
        type: "bar",
        data: previousData,
        itemStyle: { color: COLORS.previous, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12,
      },
    ],
  };

  return <EChartWrapper option={option} height={height} />;
}
