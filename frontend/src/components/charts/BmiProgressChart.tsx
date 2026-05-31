"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption, SeriesOption } from "echarts";
import type { UserBmiData } from "@/data/gamification";
import { useTranslations } from "next-intl";
import { cssRgba } from "@/lib/chart-colors";

interface BmiProgressChartProps {
  bmiData: UserBmiData;
  historyData?: Array<{ date: string; bmi: number }>;
  height?: number;
}

const NORMAL_BMI_MARK_AREA_DATA: Array<[{ yAxis: number }, { yAxis: number }]> = [
  [{ yAxis: 18.5 }, { yAxis: 24.9 }],
];

const EMPTY_BMI_HISTORY_DATA: Array<{ date: string; bmi: number }> = [];

export function BmiProgressChart({
  bmiData,
  historyData = EMPTY_BMI_HISTORY_DATA,
  height = 220,
}: BmiProgressChartProps) {
  const t = useTranslations("dashboard.progress");
  const dates = historyData.map((d) => d.date);
  const bmiValues = historyData.map((d) => d.bmi);

  // Adaptive y-axis: a fixed [15, 35] band wastes 60 % of the chart for a
  // healthy person clustered around 22 and hides week-to-week variation. We
  // pad ±2 BMI around the observed range and clamp to medical sanity bounds.
  const observed = bmiValues.filter((v) => typeof v === "number" && Number.isFinite(v));
  let yMin = 15;
  let yMax = 35;
  if (observed.length > 0) {
    const lo = Math.min(...observed, bmiData.targetBmi ?? Number.POSITIVE_INFINITY);
    const hi = Math.max(...observed, bmiData.targetBmi ?? Number.NEGATIVE_INFINITY);
    yMin = Math.max(13, Math.floor(lo - 2));
    yMax = Math.min(45, Math.ceil(hi + 2));
    // Always include the "normal" reference band so the markArea stays visible.
    yMin = Math.min(yMin, 18);
    yMax = Math.max(yMax, 25);
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "var(--color-card)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
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
      name: "BMI",
      min: yMin,
      max: yMax,
      splitLine: { lineStyle: { color: "var(--color-border)", type: "dashed" } },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 11 },
    },
    series: [
      {
        name: "BMI",
        type: "line",
        smooth: true,
        data: bmiValues,
        symbol: "circle",
        symbolSize: 5,
        itemStyle: { color: "var(--color-primary)" },
        lineStyle: { color: "var(--color-primary)", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: cssRgba("--primary", 0.25, "#1965B3") },
              { offset: 1, color: cssRgba("--primary", 0,    "#1965B3") },
            ],
          },
        },
        markPoint: {
          data: [
            { type: "max", name: t("chartHighest"), itemStyle: { color: "var(--color-warning)" } },
            { type: "min", name: t("chartLowest"),  itemStyle: { color: "var(--color-info)" } },
          ],
        },
        ...(bmiData.targetBmi != null ? {
          markLine: {
            silent: true,
            lineStyle: { color: "var(--color-success)", type: "solid", width: 1 },
            data: [
              {
                yAxis: bmiData.targetBmi,
                label: {
                  formatter: `${t("chartTarget")} ${bmiData.targetBmi}`,
                  position: "insideEndTop",
                  color: "var(--color-success)",
                  fontSize: 10,
                },
              },
            ],
          },
        } : {}),
        markArea: {
          silent: true,
          itemStyle: { color: cssRgba("--success", 0.08, "#059669") },
          data: NORMAL_BMI_MARK_AREA_DATA,
        },
      },
    ] as SeriesOption[],
  };

  return <EChartWrapper option={option} height={height} />;
}
