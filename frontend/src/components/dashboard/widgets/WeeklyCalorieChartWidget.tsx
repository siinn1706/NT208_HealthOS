"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { WeeklyCaloriePoint } from "@/types/api";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import type { ReportPeriod } from "@/types/api";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper").then((m) => m.EChartWrapper),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> }
);

// We no longer baseline the chart against a hardcoded 2 000 kcal — the API
// returns each row's per-user target so the dashed line is honest. The query
// param below is still passed for legacy backend compatibility but the UI
// treats `0` (or missing) as "no goal set" and hides the target line.
const DAILY_CALORIE_GOAL_HINT = 2000;

async function fetchMealCalories(days: number): Promise<WeeklyCaloriePoint[]> {
  const res = await fetch(`/api/v1/analytics/meal-calories?days=${days}&target=${DAILY_CALORIE_GOAL_HINT}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json();
  const data: Array<{ date: string; value: number; target: number; progress_percent?: number }> = json?.data ?? [];
  return data.map((d) => {
    const dateObj = new Date(d.date);
    return {
      date: `${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`,
      full_date: d.date,
      calories: d.value,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      target: d.target,
    };
  });
}

interface WeeklyCalorieChartWidgetProps {
  /** Pre-fetched data (used by meals page) */
  data?: WeeklyCaloriePoint[];
  /** Initial data with period (used by dashboard page) */
  initialData?: WeeklyCaloriePoint[];
  initialPeriod?: ReportPeriod;
}

export function WeeklyCalorieChartWidget({
  data: staticData,
  initialData = [],
  initialPeriod = "7d",
}: WeeklyCalorieChartWidgetProps) {
  const t = useTranslations("dashboard.calorieChart");
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [chartData, setChartData] = useState<WeeklyCaloriePoint[]>(staticData ?? initialData);
  const [isPending, startTransition] = useTransition();

  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    const d = newPeriod === "7d" ? 7 : newPeriod === "30d" ? 30 : 90;
    startTransition(async () => {
      const fresh = await fetchMealCalories(d);
      setChartData(fresh);
    });
  };

  const displayData = staticData ?? chartData;
  const hasData = displayData.some((d) => d.calories > 0);
  // Resolve the user's calorie goal from API rows. We require every visible
  // row to agree on the same (non-zero) target before drawing the goal line —
  // otherwise the dashed reference would be a fabrication.
  const targets = displayData.map((d) => d.target).filter((v) => typeof v === "number" && v > 0);
  const allAgree = targets.length === displayData.length && targets.every((v) => v === targets[0]);
  const userTarget: number | null = allAgree && targets.length > 0 ? targets[0] : null;

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "var(--color-card)",
      borderColor: "var(--color-border)",
      borderWidth: 1,
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const p = params as Array<{ value: number; seriesName: string; name: string }>;
        const calories = p.find((x) => x.seriesName === t("legend"))?.value ?? 0;
        const targetRow = userTarget
          ? `<div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.15);padding-top:4px">
              ${t("tooltipTarget")} <b>${userTarget} kcal</b>
            </div>`
          : "";
        return `
          <div style="padding:4px 6px">
            <div style="font-weight:600;margin-bottom:4px">${p[0]?.name ?? ""}</div>
            <div>${t("tooltipCalories")} <b>${calories} kcal</b></div>
            ${targetRow}
          </div>
        `;
      },
    },
    legend: {
      data: [t("legend")],
      bottom: 0,
      textStyle: { color: "var(--color-muted-foreground)", fontSize: 11 },
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
      data: displayData.map((d) => d.date),
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      splitLine: { show: false },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "var(--color-border)", type: "dashed" } },
      axisLabel: { color: "var(--color-muted-foreground)", fontSize: 10 },
      min: 0,
    },
    series: [
      {
        name: t("legend"),
        type: "bar",
        barMaxWidth: 32,
        itemStyle: {
          color: "var(--color-primary)",
          borderRadius: [4, 4, 0, 0],
        },
        data: displayData.map((d) => d.calories),
        emphasis: { focus: "series" },
      },
      ...(userTarget
        ? ([
            {
              name: t("tooltipTarget").replace(":", "").trim(),
              type: "line" as const,
              data: displayData.map(() => userTarget),
              symbol: "none" as const,
              lineStyle: { type: "dashed" as const, color: "var(--color-warning)", width: 1.5 },
              itemStyle: { color: "var(--color-warning)" },
              tooltip: { show: false },
              z: 10,
            },
          ])
        : []),
    ],
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle", { n: periodDays })}</p>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {staticData === undefined && (
            <TimeRangeSelector value={period} onChange={handlePeriodChange} />
          )}
          {userTarget && (
            <div className="flex items-center gap-1.5 text-[10px] text-warning">
              <span className="inline-block w-5 border-t-2 border-dashed border-warning" />
              {t("target", { n: userTarget })}
            </div>
          )}
        </div>
      </div>
      {isPending ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : !hasData ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          {t("noData")}
        </div>
      ) : (
        <EChartWrapper option={option} height="220px" />
      )}
    </div>
  );
}
