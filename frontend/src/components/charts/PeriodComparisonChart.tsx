"use client";

import { useTranslations } from "next-intl";
import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption } from "echarts";

interface PeriodComparisonChartProps {
  currentLabel: string;
  currentData: number[];
  previousData: number[];
  dates: string[];
  unit: string;
  height?: number;
  /** Optional override series labels (i18n-friendly). */
  currentSeriesLabel?: string;
  previousSeriesLabel?: string;
}

const COLORS = {
  current: "var(--color-primary)",
  previous: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
};

export function PeriodComparisonChart({
  currentLabel,
  currentData,
  previousData,
  dates,
  unit,
  height = 260,
  currentSeriesLabel,
  previousSeriesLabel,
}: PeriodComparisonChartProps) {
  const t = useTranslations("charts.periodComparison");
  const currentName = currentSeriesLabel ?? t("currentPeriod", { label: currentLabel });
  const previousName = previousSeriesLabel ?? t("previousPeriod");

  // Comparing against an empty previous period would draw a flat row of zeros
  // and visually overstate the current-period bars. Hide the previous series
  // when there's no real data to compare to.
  const hasPrevious = previousData.some((v) => typeof v === "number" && v !== 0);
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
        name: currentName,
        type: "bar",
        data: currentData,
        itemStyle: { color: COLORS.current, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12,
      },
      ...(hasPrevious
        ? [
            {
              name: previousName,
              type: "bar" as const,
              data: previousData,
              itemStyle: { color: COLORS.previous, borderRadius: [2 as const, 2 as const, 0 as const, 0 as const] },
              barMaxWidth: 12,
            },
          ]
        : []),
    ],
  };

  return <EChartWrapper option={option} height={height} />;
}
