"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption, SeriesOption } from "echarts";
import type { UserBmiData } from "@/data/gamification";

interface BmiProgressChartProps {
  bmiData: UserBmiData;
  historyData?: Array<{ date: string; bmi: number }>;
  height?: number;
}

export function BmiProgressChart({ bmiData, historyData = [], height = 220 }: BmiProgressChartProps) {
  const dates = historyData.map((d) => d.date);
  const bmiValues = historyData.map((d) => d.bmi);

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
      min: 15,
      max: 35,
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
        itemStyle: { color: "#41BCE6" },
        lineStyle: { color: "#41BCE6", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(65,188,230,0.25)" },
              { offset: 1, color: "rgba(65,188,230,0)" },
            ],
          },
        },
        markPoint: {
          data: [
            { type: "max", name: "Cao nhất", itemStyle: { color: "#E8BDB7" } },
            { type: "min", name: "Thấp nhất", itemStyle: { color: "#E7DEA7" } },
          ],
        },
        markLine: {
          silent: true,
          lineStyle: { color: "#16A34A", type: "solid", width: 1 },
          data: [{ yAxis: bmiData.targetBmi, label: { formatter: `Mục tiêu ${bmiData.targetBmi}`, color: "#16A34A", fontSize: 10 } }],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(22,163,74,0.06)" },
          data: [[{ yAxis: 18.5 }, { yAxis: 24.9 }]] as any,
        },
      },
    ] as SeriesOption[],
  };

  return <EChartWrapper option={option} height={height} />;
}
