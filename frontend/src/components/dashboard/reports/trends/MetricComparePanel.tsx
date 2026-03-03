"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EChartWrapper } from "@/components/charts/EChartWrapper";
import type { TrendAnalysis } from "@/types/api";
import type { EChartsOption } from "echarts-for-react";

const COLORS = {
  left:  "#41BCE6",
  right: "#E8BDB7",
  grid:  "rgba(255,255,255,0.06)",
  axis:  "rgba(255,255,255,0.35)",
};

interface MetricComparePanelProps {
  primary: TrendAnalysis;
  comparisons: TrendAnalysis[]; // list of other available metrics
}

export function MetricComparePanel({ primary, comparisons }: MetricComparePanelProps) {
  const t = useTranslations("trends");
  const [compareId, setCompareId] = useState<string>(comparisons[0]?.metric ?? "");

  const secondary = comparisons.find((c) => c.metric === compareId);

  const dates = primary.data_points.map((p) => p.date);
  const primaryVals  = primary.data_points.map((p) => p.value);
  const secondaryVals = secondary?.data_points.map((p) => p.value) ?? [];

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#0F2743", borderColor: "#1B3A5C",
      textStyle: { color: "#e2e8f0", fontSize: 11 } },
    legend: {
      top: 0, right: 0, itemWidth: 12, itemHeight: 8,
      textStyle: { color: "#94a3b8", fontSize: 11 },
    },
    grid: { top: 36, left: 52, right: 52, bottom: 28, containLabel: false },
    xAxis: {
      type: "category", data: dates,
      axisLine: { lineStyle: { color: COLORS.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b", fontSize: 10,
        interval: Math.floor(dates.length / 6),
        formatter: (val: string) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth()+1}`; },
      },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: "value", name: primary.unit,
        nameTextStyle: { color: COLORS.left, fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: COLORS.left } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: COLORS.grid } },
        axisLabel: { color: "#64748b", fontSize: 10 },
      },
      {
        type: "value", name: secondary?.unit ?? "",
        nameTextStyle: { color: COLORS.right, fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: COLORS.right } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: "#64748b", fontSize: 10 },
      },
    ],
    series: [
      {
        name: primary.metric_label,
        type: "line",
        yAxisIndex: 0,
        data: primaryVals,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: COLORS.left, width: 2.5 },
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(65,188,230,0.13)" },
              { offset: 1, color: "rgba(65,188,230,0)" },
            ],
          },
        },
      },
      ...(secondary
        ? [{
            name: secondary.metric_label,
            type: "line" as const,
            yAxisIndex: 1,
            data: secondaryVals,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: COLORS.right, width: 2 },
            areaStyle: {
              color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(232,189,183,0.1)" },
                  { offset: 1, color: "rgba(232,189,183,0)" },
                ],
              },
            },
          }]
        : []),
    ],
  };

  if (comparisons.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("compare")}</h3>
        <Select value={compareId} onValueChange={setCompareId}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue placeholder={t("compareMetric")} />
          </SelectTrigger>
          <SelectContent>
            {comparisons.map((c) => (
              <SelectItem key={c.metric} value={c.metric} className="text-xs">
                {c.metric_label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <EChartWrapper option={option} height={280} />
    </div>
  );
}
