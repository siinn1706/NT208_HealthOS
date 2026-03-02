"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption, SeriesOption } from "echarts";

export interface VitalsDataPoint {
  date: string; // "MM-DD"
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
}

interface VitalsLineChartProps {
  data: VitalsDataPoint[];
  labels?: {
    heartRate?: string;
    systolic?: string;
    diastolic?: string;
  };
  height?: number;
}

// NIGHT SKY chart palette
const COLORS = {
  heartRate: "#41BCE6",
  systolic: "#E8BDB7",
  diastolic: "#E7DEA7",
};

export function VitalsLineChart({
  data,
  labels = {
    heartRate: "Heart Rate",
    systolic: "Systolic BP",
    diastolic: "Diastolic BP",
  },
  height = 260,
}: VitalsLineChartProps) {
  const dates = data.map((d) => d.date);

  const series: SeriesOption[] = [
    {
      name: labels.heartRate,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      data: data.map((d) => d.heartRate ?? null),
      itemStyle: { color: COLORS.heartRate },
      lineStyle: { color: COLORS.heartRate, width: 2 },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(65,188,230,0.25)" },
            { offset: 1, color: "rgba(65,188,230,0)" },
          ],
        },
      },
    },
    {
      name: labels.systolic,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      data: data.map((d) => d.systolic ?? null),
      itemStyle: { color: COLORS.systolic },
      lineStyle: { color: COLORS.systolic, width: 2, type: "dashed" },
    },
    {
      name: labels.diastolic,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      data: data.map((d) => d.diastolic ?? null),
      itemStyle: { color: COLORS.diastolic },
      lineStyle: { color: COLORS.diastolic, width: 2, type: "dashed" },
    },
  ];

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
      itemWidth: 14,
      itemHeight: 8,
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
      min: "dataMin",
      splitLine: {
        lineStyle: { color: "var(--color-border)", type: "dashed" },
      },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 11 },
    },
    series,
  };

  return <EChartWrapper option={option} height={height} />;
}
