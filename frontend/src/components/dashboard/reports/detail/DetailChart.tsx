"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { EChartWrapper } from "@/components/charts/EChartWrapper";
import type { EChartsOption } from "echarts-for-react";
import type { ReportSection } from "@/types/api";
import { METRIC_COLORS } from "@/lib/metric-colors";

interface DetailChartProps {
  section: ReportSection;
  height?: number;
}

// Night Sky palette
const COLORS = {
  primary:   "#41BCE6",
  secondary: "#E8BDB7",
  tertiary:  "#E7DEA7",
  accent:    "#6DE7F7",
  warning:   "#F59E0B",
  critical:  "#E14B4B",
  gridLine:  "rgba(65,188,230,0.08)",
  tooltip:   "rgba(15,39,67,0.95)",
  text:      "#9CA3AF",
};

interface VitalsLabels {
  hr: string;
  sys: string;
  dia: string;
}

function buildVitalsOption(section: ReportSection, labels: VitalsLabels): EChartsOption {
  const dates = section.data.map((d) => d.date);
  const hr    = section.data.map((d) => d.value);
  const sys   = section.data.map((d) => d.value2 ?? null);
  const dia   = section.data.map((d) => d.value3 ?? null);

  // HR (~40-180 bpm) and BP (~60-200 mmHg) overlap if forced onto a single
  // axis: a 90 bpm reading reads identically to a 90 mmHg diastolic value,
  // which is misleading. Each metric gets its own axis with its own units.
  const hasBp = sys.some((v) => v !== null) || dia.some((v) => v !== null);

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: COLORS.tooltip,
      borderColor: "transparent",
      textStyle: { color: "#E8F8FD", fontSize: 12 },
      formatter: (params: unknown) => {
        const items = params as Array<{ axisValue: string; seriesName: string; value: number; color: string }>;
        if (!items?.length) return "";
        let html = `<div style="margin-bottom:4px;font-weight:600">${items[0].axisValue}</div>`;
        items.forEach((i) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${i.color}"></span>
            <span>${i.seriesName}: <b>${i.value ?? "-"}</b></span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: hasBp ? [labels.hr, labels.sys, labels.dia] : [labels.hr],
      bottom: 0,
      textStyle: { color: COLORS.text, fontSize: 11 },
    },
    grid: { top: 12, right: hasBp ? 56 : 16, bottom: 48, left: 48, containLabel: false },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: COLORS.gridLine } },
      axisTick: { show: false },
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: dates.length > 14 ? 30 : 0 },
    },
    yAxis: hasBp
      ? [
          {
            type: "value",
            name: "bpm",
            splitLine: { lineStyle: { color: COLORS.gridLine } },
            axisLabel: { color: COLORS.text, fontSize: 10 },
          },
          {
            type: "value",
            name: "mmHg",
            position: "right",
            splitLine: { show: false },
            axisLabel: { color: COLORS.text, fontSize: 10 },
          },
        ]
      : [
          {
            type: "value",
            name: "bpm",
            splitLine: { lineStyle: { color: COLORS.gridLine } },
            axisLabel: { color: COLORS.text, fontSize: 10 },
          },
        ],
    series: [
      {
        name: labels.hr,
        type: "line",
        data: hr,
        yAxisIndex: 0,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: METRIC_COLORS.hr, width: 2 },
        itemStyle: { color: METRIC_COLORS.hr },
        areaStyle: { color: `${METRIC_COLORS.hr}20` },
      },
      ...(hasBp
        ? ([
            {
              name: labels.sys,
              type: "line",
              data: sys,
              yAxisIndex: 1,
              smooth: true,
              symbol: "none",
              lineStyle: { color: METRIC_COLORS.systolic, width: 2 },
              itemStyle: { color: METRIC_COLORS.systolic },
            },
            {
              name: labels.dia,
              type: "line",
              data: dia,
              yAxisIndex: 1,
              smooth: true,
              symbol: "none",
              lineStyle: { color: METRIC_COLORS.diastolic, width: 1.5, type: "dashed" },
              itemStyle: { color: METRIC_COLORS.diastolic },
            },
          ] as const)
        : []),
    ],
  };
}

function buildNutritionOption(section: ReportSection): EChartsOption {
  const dates    = section.data.map((d) => d.date);
  const calories = section.data.map((d) => d.value);
  const protein  = section.data.map((d) => d.value2 ?? null);
  const carbs    = section.data.map((d) => d.value3 ?? null);

  return {
    tooltip: { trigger: "axis", backgroundColor: COLORS.tooltip, textStyle: { color: "#E8F8FD", fontSize: 12 } },
    legend: {
      data: ["Calo (kcal)", "Protein (g)", "Carbs (g)"],
      bottom: 0,
      textStyle: { color: COLORS.text, fontSize: 11 },
    },
    grid: { top: 12, right: 16, bottom: 48, left: 56, containLabel: false },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: dates.length > 14 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: [
      { type: "value", name: "kcal", splitLine: { lineStyle: { color: COLORS.gridLine } }, axisLabel: { color: COLORS.text, fontSize: 10 } },
      { type: "value", name: "g",    splitLine: { show: false },                            axisLabel: { color: COLORS.text, fontSize: 10 } },
    ],
    series: [
      { name: "Calo (kcal)", type: "bar", data: calories, yAxisIndex: 0, itemStyle: { color: COLORS.primary, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 20 },
      { name: "Protein (g)", type: "line", data: protein, yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 4, lineStyle: { color: COLORS.secondary, width: 2 }, itemStyle: { color: COLORS.secondary } },
      { name: "Carbs (g)",   type: "line", data: carbs,   yAxisIndex: 1, smooth: true, symbol: "none",   lineStyle: { color: COLORS.tertiary, width: 2, type: "dashed" }, itemStyle: { color: COLORS.tertiary } },
    ],
  };
}

function buildActivityOption(section: ReportSection): EChartsOption {
  const dates = section.data.map((d) => d.date);
  const steps = section.data.map((d) => d.value);
  const calo  = section.data.map((d) => d.value2 ?? null);

  return {
    tooltip: { trigger: "axis", backgroundColor: COLORS.tooltip, textStyle: { color: "#E8F8FD", fontSize: 12 } },
    legend: { data: ["Số bước", "Calo đốt (kcal)"], bottom: 0, textStyle: { color: COLORS.text, fontSize: 11 } },
    grid: { top: 12, right: 56, bottom: 48, left: 56, containLabel: false },
    xAxis: {
      type: "category", data: dates,
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: dates.length > 14 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: [
      { type: "value", name: "Bước",  splitLine: { lineStyle: { color: COLORS.gridLine } }, axisLabel: { color: COLORS.text, fontSize: 10 } },
      { type: "value", name: "kcal",  splitLine: { show: false },                            axisLabel: { color: COLORS.text, fontSize: 10 }, position: "right" },
    ],
    series: [
      {
        name: "Số bước", type: "bar", data: steps, yAxisIndex: 0,
        itemStyle: { color: COLORS.accent, borderRadius: [3, 3, 0, 0] },
        markLine: { data: [{ yAxis: 10000, name: "Mục tiêu" }], label: { formatter: "10k bước", color: COLORS.text, fontSize: 10 }, lineStyle: { color: COLORS.tertiary, type: "dashed" } },
        barMaxWidth: 20,
      },
      {
        name: "Calo đốt (kcal)", type: "line", data: calo, yAxisIndex: 1, smooth: true,
        symbol: "circle", symbolSize: 4,
        lineStyle: { color: COLORS.secondary, width: 2 }, itemStyle: { color: COLORS.secondary },
      },
    ],
  };
}

function buildSleepOption(section: ReportSection): EChartsOption {
  const dates   = section.data.map((d) => d.date);
  const hours   = section.data.map((d) => d.value);
  const quality = section.data.map((d) => d.value2 ?? null);

  return {
    tooltip: { trigger: "axis", backgroundColor: COLORS.tooltip, textStyle: { color: "#E8F8FD", fontSize: 12 } },
    legend: { data: ["Số giờ", "Chất lượng (%)"], bottom: 0, textStyle: { color: COLORS.text, fontSize: 11 } },
    grid: { top: 12, right: 56, bottom: 48, left: 48, containLabel: false },
    xAxis: {
      type: "category", data: dates,
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: dates.length > 14 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: [
      { type: "value", name: "Giờ", min: 0, max: 12, splitLine: { lineStyle: { color: COLORS.gridLine } }, axisLabel: { color: COLORS.text, fontSize: 10 } },
      { type: "value", name: "%",   min: 0, max: 100, splitLine: { show: false }, position: "right", axisLabel: { color: COLORS.text, fontSize: 10 } },
    ],
    series: [
      {
        name: "Số giờ", type: "bar", data: hours, yAxisIndex: 0,
        itemStyle: { color: COLORS.tertiary, borderRadius: [3, 3, 0, 0] },
        markArea: { data: [[{ yAxis: 7 }, { yAxis: 9 }]], itemStyle: { color: `${COLORS.primary}15` }, label: { show: false } },
        barMaxWidth: 20,
      },
      {
        name: "Chất lượng (%)", type: "line", data: quality, yAxisIndex: 1, smooth: true,
        symbol: "circle", symbolSize: 4,
        lineStyle: { color: COLORS.accent, width: 2 }, itemStyle: { color: COLORS.accent },
        areaStyle: { color: `${COLORS.accent}15` },
      },
    ],
  };
}

function buildBmiOption(section: ReportSection): EChartsOption {
  const dates   = section.data.map((d) => d.date);
  const bmi     = section.data.map((d) => d.value);
  const weights = section.data.map((d) => d.value2 ?? null);

  return {
    tooltip: { trigger: "axis", backgroundColor: COLORS.tooltip, textStyle: { color: "#E8F8FD", fontSize: 12 } },
    legend: { data: ["BMI", "Cân nặng (kg)"], bottom: 0, textStyle: { color: COLORS.text, fontSize: 11 } },
    grid: { top: 12, right: 56, bottom: 48, left: 48, containLabel: false },
    xAxis: {
      type: "category", data: dates,
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: 30 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value", name: "BMI", min: 15, max: 40,
        splitLine: { lineStyle: { color: COLORS.gridLine } }, axisLabel: { color: COLORS.text, fontSize: 10 },
      },
      { type: "value", name: "kg", min: 40, splitLine: { show: false }, position: "right", axisLabel: { color: COLORS.text, fontSize: 10 } },
    ],
    series: [
      {
        name: "BMI", type: "line", data: bmi, yAxisIndex: 0, smooth: true,
        symbol: "circle", symbolSize: 5,
        lineStyle: { color: COLORS.primary, width: 2 }, itemStyle: { color: COLORS.primary },
        // Reference bands: underweight <18.5, normal 18.5-25, overweight 25-30, obese 30+
        markArea: {
          data: [
            [{ yAxis: 18.5, itemStyle: { color: `${COLORS.accent}15` } }, { yAxis: 25 }],
            [{ yAxis: 25,   itemStyle: { color: `${COLORS.tertiary}20` } }, { yAxis: 30 }],
            [{ yAxis: 30,   itemStyle: { color: `${COLORS.critical}15` } }, { yAxis: 40 }],
          ],
          label: { show: false },
        },
      },
      {
        name: "Cân nặng (kg)", type: "line", data: weights, yAxisIndex: 1, smooth: true,
        symbol: "none", lineStyle: { color: COLORS.secondary, width: 1.5, type: "dashed" }, itemStyle: { color: COLORS.secondary },
      },
    ],
  };
}

function buildMedicationOption(section: ReportSection): EChartsOption {
  const dates = section.data.map((d) => d.date);
  const comp  = section.data.map((d) => d.value);

  return {
    tooltip: { trigger: "axis", backgroundColor: COLORS.tooltip, textStyle: { color: "#E8F8FD", fontSize: 12 } },
    grid: { top: 12, right: 16, bottom: 48, left: 48, containLabel: false },
    xAxis: {
      type: "category", data: dates,
      axisLabel: { color: COLORS.text, fontSize: 10, rotate: dates.length > 14 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value", min: 0, max: 100, name: "%",
      splitLine: { lineStyle: { color: COLORS.gridLine } }, axisLabel: { color: COLORS.text, fontSize: 10 },
    },
    series: [
      {
        name: "Tuân thủ (%)", type: "bar", data: comp, barMaxWidth: 20,
        itemStyle: {
          color: (params: { data: number }) => params.data >= 100 ? COLORS.primary : params.data >= 50 ? COLORS.tertiary : COLORS.critical,
          borderRadius: [3, 3, 0, 0],
        },
        markLine: { data: [{ yAxis: 90 }], lineStyle: { color: COLORS.tertiary, type: "dashed" }, label: { formatter: "Mục tiêu 90%", color: COLORS.text, fontSize: 10 } },
      },
    ],
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DetailChart({ section, height = 340 }: DetailChartProps) {
  const t = useTranslations("dashboard.reports.detail");
  const vitalsLabels = useMemo<VitalsLabels>(
    () => ({ hr: t("vitalsHr"), sys: t("vitalsSys"), dia: t("vitalsDia") }),
    [t],
  );

  // useMemo must run unconditionally — hooks order would change if the
  // empty-state early-return preceded it (React would crash on the next
  // mount when data appears).
  const option = useMemo<EChartsOption>(() => {
    switch (section.category) {
      case "vitals":     return buildVitalsOption(section, vitalsLabels);
      case "nutrition":  return buildNutritionOption(section);
      case "activity":   return buildActivityOption(section);
      case "sleep":      return buildSleepOption(section);
      case "bmi":        return buildBmiOption(section);
      case "medication": return buildMedicationOption(section);
      default:           return buildVitalsOption(section, vitalsLabels);
    }
  }, [section, vitalsLabels]);

  if (!section.data?.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground"
        style={{ height }}
      >
        {t("noData")}
      </div>
    );
  }

  return <EChartWrapper option={option} height={height} />;
}
