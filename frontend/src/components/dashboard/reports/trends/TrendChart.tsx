"use client";

import { useTranslations } from "next-intl";
import { EChartWrapper } from "@/components/charts/EChartWrapper";
import type { TrendAnalysis, AnomalyPoint } from "@/types/api";
import type { EChartsOption } from "echarts-for-react";
import { getCssVar, cssRgba } from "@/lib/chart-colors";

interface TrendChartProps {
  analysis: TrendAnalysis;
  height?: number;
}

export function TrendChart({ analysis, height = 360 }: TrendChartProps) {
  const t = useTranslations("trends");

  // Build canvas-safe colors at render time so CSS vars are resolved on the
  // client. Canvas 2D API rejects color-mix() and var() inside colorStops.
  const COLORS = {
    actual:     getCssVar("--primary",     "#1965B3"),
    trend:      getCssVar("--warning",     "#D97706"),
    prediction: getCssVar("--info",        "#0284C7"),
    anomaly:    getCssVar("--destructive", "#E54D4D"),
    band:       cssRgba("--info",        0.15, "#0284C7"),
    grid:       cssRgba("--foreground",  0.08, "#0F2743"),
    axis:       cssRgba("--foreground",  0.25, "#0F2743"),
    axisLabel:  getCssVar("--muted-foreground", "#5B90C4"),
    areaTop:    cssRgba("--primary",     0.18, "#1965B3"),
    areaBot:    cssRgba("--primary",     0.00, "#1965B3"),
    zoomFill:   cssRgba("--primary",     0.15, "#1965B3"),
  };

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

  // Optional uncertainty band around the prediction. The TrendAnalysis API
  // returns a flat point estimate today, so we synthesise a ± confidence
  // halo from `confidence` (0-1) — narrower halo as confidence grows. When
  // confidence is missing we omit the band entirely rather than make one up.
  const conf = typeof analysis.confidence === "number" ? Math.max(0, Math.min(1, analysis.confidence)) : null;
  const bandSpread = conf === null ? null : Math.max(0.05, 1 - conf) * (predictionVals[0] ?? 1) * 0.15;
  const lowerBand = bandSpread === null
    ? null
    : [...actualDates.map(() => null), ...predictionVals.map((v) => v - bandSpread)];
  const upperBand = bandSpread === null
    ? null
    : [...actualDates.map(() => null), ...predictionVals.map((v) => v + bandSpread)];

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "var(--color-card)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 11 },
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
        return `<div style="font-size:11px;padding:4px 0"><div style="margin-bottom:4px;color:var(--color-muted-foreground)">${date}</div>${rows}</div>`;
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: COLORS.axisLabel, fontSize: 11 },
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
        color: COLORS.axisLabel,
        fontSize: 10,
        // Base interval on actual (non-prediction) dates only so prediction
        // extension doesn't halve the label density.
        interval: Math.max(0, Math.floor(actualDates.length / 7) - 1),
        formatter: (val: string) => {
          // Split instead of new Date() to avoid UTC-midnight timezone shift
          // turning "2026-04-27" into "26/4" in negative-offset browsers.
          const [, m, d] = val.split("-");
          return `${parseInt(d)}/${parseInt(m)}`;
        },
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: analysis.unit,
      nameTextStyle: { color: COLORS.axisLabel, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { color: COLORS.axisLabel, fontSize: 10 },
    },
    dataZoom: [
      {
        type: "slider",
        bottom: 4,
        height: 20,
        borderColor: "var(--color-border)",
        fillerColor: COLORS.zoomFill,
        handleStyle: { color: COLORS.actual },
        textStyle: { color: COLORS.axisLabel, fontSize: 9 },
        start: 0,
        end: 100,
      },
    ],
    series: [
      ...(lowerBand && upperBand
        ? ([
            // Invisible lower bound to anchor the band's start.
            {
              name: "__lowerBand",
              type: "line" as const,
              data: lowerBand,
              showSymbol: false,
              lineStyle: { opacity: 0 },
              stack: "uncertaintyBand",
              tooltip: { show: false },
              silent: true,
            },
            // The visible band fill (delta = upper - lower) stacked above.
            {
              name: t("chart.uncertaintyBand"),
              type: "line" as const,
              data: upperBand.map((u, i) => (u !== null && lowerBand[i] !== null ? u - (lowerBand[i] as number) : null)),
              showSymbol: false,
              lineStyle: { opacity: 0 },
              stack: "uncertaintyBand",
              areaStyle: { color: COLORS.band },  // cssRgba — canvas-safe
              tooltip: { show: false },
              silent: true,
            },
          ])
        : []),
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
              { offset: 0, color: COLORS.areaTop },
              { offset: 1, color: COLORS.areaBot },
            ],
          },
        },
        markPoint: {
          symbol: "circle",
          symbolSize: 10,
          data: anomalyMarkData,
          label: { show: false },
          itemStyle: { borderColor: "var(--color-card)", borderWidth: 2 },
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
          ...actualDates.map(() => null),
          ...predictionVals,
        ],
        smooth: true,
        showSymbol: false,
        lineStyle: { color: COLORS.prediction, width: 2, type: "dotted" },
      },
    ],
  };

  // Screen-reader-friendly data table: charts are inert to AT users without
  // a textual fallback. We hide it visually but expose every (date, value)
  // pair plus the prediction window so users can verify the visualization.
  const srRows = [
    ...actualDates.map((d, i) => ({ date: d, value: actualVals[i], series: t("chart.actual") })),
    ...predictionDates.map((d, i) => ({ date: d, value: predictionVals[i], series: t("chart.prediction") })),
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <EChartWrapper option={option} height={height} />
      <table className="sr-only">
        <caption>{t("chart.srCaption")}</caption>
        <thead>
          <tr>
            <th>{t("chart.srDate")}</th>
            <th>{t("chart.srSeries")}</th>
            <th>{t("chart.srValue")}</th>
          </tr>
        </thead>
        <tbody>
          {srRows.map((r, i) => (
            <tr key={`${r.series}-${r.date}-${i}`}>
              <td>{r.date}</td>
              <td>{r.series}</td>
              <td>{typeof r.value === "number" ? `${r.value.toFixed(1)} ${analysis.unit}` : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
