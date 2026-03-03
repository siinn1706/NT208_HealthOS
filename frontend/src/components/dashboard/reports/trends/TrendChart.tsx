"use client";

import { useTranslations } from "next-intl";
import { EChartWrapper } from "@/components/charts/EChartWrapper";
import type { TrendAnalysis, AnomalyPoint } from "@/types/api";
import type { EChartsOption } from "echarts-for-react";

interface TrendChartProps {
  analysis: TrendAnalysis;
  height?: number;
}

const COLORS = {
  actual:     "#41BCE6",
  trend:      "#E7DEA7",
  prediction: "#6DE7F7",
  anomaly:    "#EF4444",
  grid:       "rgba(255,255,255,0.06)",
  axis:       "rgba(255,255,255,0.35)",
};

export function TrendChart({ analysis, height = 360 }: TrendChartProps) {
  const t = useTranslations("trends");

  const actualDates   = analysis.data_points.map((p) => p.date);
  const actualVals    = analysis.data_points.map((p) => p.value);
  const trendVals     = analysis.trend_line;

  // Generate prediction dates starting the day after the last actual date
  const lastActualDate = actualDates.at(-1) ?? new Date().toISOString().split("T")[0];
  const predictionDates = analysis.prediction.map((_, i) => {
    const d = new Date(lastActualDate);
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split("T")[0];
  });
  const predictionVals  = analysis.prediction;

  // For anomaly markPoints on the actual series
  const anomalyMarkData: Array<{ name: string; coord: [string, number]; itemStyle: { color: string } }> =
    analysis.anomalies
      .filter((a: AnomalyPoint) => actualDates.includes(a.date))
      .map((a: AnomalyPoint) => ({
        name: t("chart.anomaly"),
        coord: [a.date, a.value] as [string, number],
        itemStyle: { color: COLORS.anomaly },
      }));

  // Concat dates for x-axis (actual + prediction)
  const allDates = [...actualDates, ...predictionDates];

  // Pad actual + trend arrays with null for prediction zone
  const actualPadded = [...actualVals, ...predictionDates.map(() => null)];
  const trendPadded  = [...trendVals, ...predictionDates.map(() => null)];

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0F2743",
      borderColor: "#1B3A5C",
      textStyle: { color: "#e2e8f0", fontSize: 11 },
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string; value: number | null; axisValue: string; color: string }>;
        const date = p[0]?.axisValue ?? "";
        const rows = p
          .filter((s) => s.value !== null && s.value !== undefined)
          .map(
            (s) =>
              `<div style="display:flex;gap:8px;align-items:center">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color}"></span>
                <span>${s.seriesName}:</span>
                <strong>${s.value?.toFixed(1)} ${analysis.unit}</strong>
              </div>`
          )
          .join("");
        return `<div style="font-size:11px;padding:4px 0"><div style="margin-bottom:4px;color:#94a3b8">${date}</div>${rows}</div>`;
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      data: [
        t("chart.actual"),
        t("chart.trendLine"),
        t("chart.prediction"),
      ],
    },
    grid: { top: 36, left: 48, right: 16, bottom: 56, containLabel: false },
    xAxis: {
      type: "category",
      data: allDates,
      axisLine: { lineStyle: { color: COLORS.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b",
        fontSize: 10,
        interval: Math.floor(allDates.length / 7),
        formatter: (val: string) => {
          const d = new Date(val);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        },
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: analysis.unit,
      nameTextStyle: { color: "#64748b", fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { color: "#64748b", fontSize: 10 },
    },
    dataZoom: [
      {
        type: "slider",
        bottom: 4,
        height: 20,
        borderColor: "#1B3A5C",
        fillerColor: "rgba(65,188,230,0.15)",
        handleStyle: { color: "#41BCE6" },
        textStyle: { color: "#64748b", fontSize: 9 },
        start: 0,
        end: 100,
      },
    ],
    series: [
      // Actual data
      {
        name: t("chart.actual"),
        type: "line",
        data: actualPadded,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: COLORS.actual, width: 2.5 },
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(65,188,230,0.18)" },
              { offset: 1, color: "rgba(65,188,230,0)" },
            ],
          },
        },
        markPoint: {
          symbol: "circle",
          symbolSize: 10,
          data: anomalyMarkData,
          label: { show: false },
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
        },
      },
      // Trend line
      {
        name: t("chart.trendLine"),
        type: "line",
        data: trendPadded,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: COLORS.trend, width: 1.5, type: "dashed" },
        areaStyle: { opacity: 0 },
      },
      // Prediction
      {
        name: t("chart.prediction"),
        type: "line",
        data: [
          // Bridge point = last actual value aligned to first prediction date index
          ...actualDates.map(() => null),
          ...predictionVals,
        ],
        smooth: true,
        showSymbol: false,
        lineStyle: { color: COLORS.prediction, width: 2, type: "dotted" },
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(109,231,247,0.14)" },
              { offset: 1, color: "rgba(109,231,247,0)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <EChartWrapper option={option} height={height} />
    </div>
  );
}
