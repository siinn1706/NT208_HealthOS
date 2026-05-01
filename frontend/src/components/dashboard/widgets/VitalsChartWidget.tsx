"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Activity, Footprints, Moon, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { EChartWrapper } from "@/components/charts/EChartWrapper";
import type { ReportPeriod } from "@/types/api";
import type { VitalsDataPoint } from "@/components/charts/VitalsLineChart";
import { METRIC_COLORS } from "@/lib/metric-colors";
import type { EChartsOption } from "echarts";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtendedVitalPoint {
  date: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  steps?: number;
  sleepMinutes?: number;
  weightKg?: number;
}

type MetricTab = "vitals" | "steps" | "sleep" | "weight";

// ── Reference ranges ──────────────────────────────────────────────────────────

const REF = {
  hr:        { min: 60,   max: 100,   unit: "bpm"   },
  systolic:  { min: 90,   max: 140,   unit: "mmHg"  },
  diastolic: { min: 60,   max: 90,    unit: "mmHg"  },
  steps:     { min: 5000, max: 15000, unit: "bước"  },
  sleep:     { min: 6,    max: 9,     unit: "giờ"   }, // hours
  weight:    { min: 45,   max: 95,    unit: "kg"    },
};

// ── Stats helper ──────────────────────────────────────────────────────────────

type Trend = "flat" | "up" | "down";

function calcStats(values: (number | undefined)[]): { min: number | null; max: number | null; avg: number | null; trend: Trend } {
  const v = values.filter((x): x is number => x != null && isFinite(x));
  if (!v.length) return { min: null, max: null, avg: null, trend: "flat" };
  const min = Math.min(...v);
  const max = Math.max(...v);
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const first3 = v.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, v.length);
  const last3  = v.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, v.length);
  const diff   = last3 - first3;
  const trend: Trend = Math.abs(diff) < avg * 0.02 ? "flat" : diff > 0 ? "up" : "down";
  return { min, max, avg, trend };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchExtended(days: number): Promise<ExtendedVitalPoint[]> {
  try {
    const res = await fetch(`/api/v1/dashboard/vitals-extended?days=${days}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json?.data ?? []).map((r: any) => ({
      date:         r.date          ?? "",
      heartRate:    r.heart_rate    ?? undefined,
      systolic:     r.systolic      ?? undefined,
      diastolic:    r.diastolic     ?? undefined,
      steps:        r.steps         ?? undefined,
      sleepMinutes: r.sleep_minutes ?? undefined,
      weightKg:     r.weight_kg     ?? undefined,
    }));
  } catch {
    return [];
  }
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  label, value, unit, trend, color, warnHigh, warnLow,
}: {
  label: string;
  value: number | null;
  unit: string;
  trend: "up" | "down" | "flat";
  color: string;
  warnHigh?: number;
  warnLow?: number;
}) {
  const abnormal =
    value != null &&
    ((warnHigh != null && value > warnHigh) || (warnLow != null && value < warnLow));

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground font-medium leading-none">{label}</span>
      <div className="flex items-center gap-0.5">
        <span
          className={cn("text-sm font-bold tabular-nums leading-none", abnormal ? "text-destructive" : "")}
          style={!abnormal ? { color } : undefined}
        >
          {value != null ? (Number.isInteger(value) ? value : value.toFixed(1)) : "—"}
        </span>
        <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
        {trend === "up"   && <TrendingUp   className="w-3 h-3 ml-0.5 text-emerald-500 flex-shrink-0" />}
        {trend === "down" && <TrendingDown className="w-3 h-3 ml-0.5 text-red-400    flex-shrink-0" />}
        {trend === "flat" && <Minus        className="w-3 h-3 ml-0.5 text-muted-foreground flex-shrink-0" />}
      </div>
    </div>
  );
}

// ── ECharts option builders ────────────────────────────────────────────────────

const AXIS_LABEL_STYLE = { color: "var(--color-muted-foreground)", fontSize: 10 } as const;
const SPLIT_LINE = { lineStyle: { color: "var(--color-border)", type: "dashed" as const } } as const;
const TOOLTIP_BASE = {
  trigger: "axis" as const,
  backgroundColor: "var(--color-card)",
  borderColor:     "var(--color-border)",
  textStyle:       { color: "var(--color-foreground)", fontSize: 12 },
} as const;

function buildVitalsOption(
  data: ExtendedVitalPoint[],
  labels: { heartRate: string; systolic: string; diastolic: string },
): EChartsOption {
  const dates = data.map((d) => d.date.slice(5));
  return {
    backgroundColor: "transparent",
    tooltip: TOOLTIP_BASE,
    legend: {
      bottom: 2, left: "center", itemWidth: 12, itemHeight: 7,
      textStyle: { color: "var(--color-muted-foreground)", fontSize: 10 },
    },
    grid: { top: 16, left: 10, right: 10, bottom: 40, containLabel: true },
    xAxis: {
      type: "category", data: dates, axisTick: { show: false },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: AXIS_LABEL_STYLE,
    },
    yAxis: { type: "value", min: "dataMin", splitLine: SPLIT_LINE, axisLabel: AXIS_LABEL_STYLE },
    visualMap: [{
      show: false, type: "piecewise", seriesIndex: 0,
      pieces: [{ gt: 0, lte: REF.hr.max, color: METRIC_COLORS.hr }, { gt: REF.hr.max, color: "#ef4444" }],
    }],
    series: [
      {
        name: labels.heartRate, type: "line", smooth: true, symbol: "circle", symbolSize: 4,
        data: data.map((d) => d.heartRate ?? null),
        itemStyle: { color: METRIC_COLORS.hr },
        lineStyle: { color: METRIC_COLORS.hr, width: 2.5 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: `${METRIC_COLORS.hr}28` }, { offset: 1, color: `${METRIC_COLORS.hr}00` }] } },
        markLine: {
          silent: true, symbol: "none",
          data: [{ yAxis: REF.hr.max, lineStyle: { color: "#ef444455", type: "dashed", width: 1 } }],
          label: { formatter: String(REF.hr.max), fontSize: 9, color: "#ef444480", position: "end" },
        },
      },
      {
        name: labels.systolic, type: "line", smooth: true, symbol: "circle", symbolSize: 4,
        data: data.map((d) => d.systolic ?? null),
        itemStyle: { color: METRIC_COLORS.systolic },
        lineStyle: { color: METRIC_COLORS.systolic, width: 2, type: "dashed" },
        markLine: {
          silent: true, symbol: "none",
          data: [{ yAxis: REF.systolic.max, lineStyle: { color: "#f9731655", type: "dashed", width: 1 } }],
          label: { formatter: String(REF.systolic.max), fontSize: 9, color: "#f9731680", position: "end" },
        },
      },
      {
        name: labels.diastolic, type: "line", smooth: true, symbol: "circle", symbolSize: 4,
        data: data.map((d) => d.diastolic ?? null),
        itemStyle: { color: METRIC_COLORS.diastolic },
        lineStyle: { color: METRIC_COLORS.diastolic, width: 1.5, type: "dotted" },
      },
    ],
  };
}

function buildStepsOption(data: ExtendedVitalPoint[]): EChartsOption {
  const dates  = data.map((d) => d.date.slice(5));
  const values = data.map((d) => d.steps ?? null);
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...TOOLTIP_BASE,
      formatter: (p: unknown) => {
        const [item] = p as { name: string; value: number }[];
        return item ? `${item.name}<br/><b>${(item.value ?? 0).toLocaleString()} bước</b>` : "";
      },
    },
    grid: { top: 16, left: 10, right: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category", data: dates, axisTick: { show: false },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: AXIS_LABEL_STYLE,
    },
    yAxis: {
      type: "value", min: 0, splitLine: SPLIT_LINE,
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) },
    },
    visualMap: {
      show: false, type: "piecewise", dimension: 1,
      pieces: [{ lt: 5000, color: "#f87171" }, { gte: 5000, lt: 10000, color: "#fb923c" }, { gte: 10000, color: "#34d399" }],
    },
    series: [{
      type: "bar", data: values, barMaxWidth: 24, barMinHeight: 2,
      markLine: {
        silent: true, symbol: "none",
        data: [{ yAxis: 10000, lineStyle: { color: "#34d39960", type: "dashed", width: 1.5 } }],
        label: { formatter: "10k mục tiêu", fontSize: 9, color: "#34d399aa", position: "insideEndTop" },
      },
    }],
  };
}

function buildSleepOption(data: ExtendedVitalPoint[]): EChartsOption {
  const dates  = data.map((d) => d.date.slice(5));
  const values = data.map((d) => d.sleepMinutes != null ? +(d.sleepMinutes / 60).toFixed(2) : null);
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...TOOLTIP_BASE,
      formatter: (p: unknown) => {
        const [item] = p as { name: string; value: number }[];
        return item ? `${item.name}<br/><b>${(item.value ?? 0).toFixed(1)} giờ</b>` : "";
      },
    },
    grid: { top: 16, left: 10, right: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category", data: dates, axisTick: { show: false },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: AXIS_LABEL_STYLE,
    },
    yAxis: {
      type: "value", min: 0, max: 12, splitLine: SPLIT_LINE,
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => `${v}h` },
    },
    visualMap: {
      show: false, type: "piecewise", dimension: 1,
      pieces: [{ lt: 6, color: "#f87171" }, { gte: 6, lt: 8, color: "#a78bfa" }, { gte: 8, color: "#60a5fa" }],
    },
    series: [{
      type: "bar", data: values, barMaxWidth: 24, barMinHeight: 2,
      markLine: {
        silent: true, symbol: "none",
        data: [{ yAxis: 7, lineStyle: { color: "#a78bfa60", type: "dashed", width: 1.5 } }],
        label: { formatter: "7h mục tiêu", fontSize: 9, color: "#a78bfaaa", position: "insideEndTop" },
      },
    }],
  };
}

function buildWeightOption(data: ExtendedVitalPoint[]): EChartsOption {
  const dates  = data.map((d) => d.date.slice(5));
  const values = data.map((d) => d.weightKg ?? null);
  const valid  = values.filter((v): v is number => v != null);
  const lo     = valid.length ? Math.min(...valid) - 1.5 : 45;
  const hi     = valid.length ? Math.max(...valid) + 1.5 : 95;
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...TOOLTIP_BASE,
      formatter: (p: unknown) => {
        const [item] = p as { name: string; value: number }[];
        return item ? `${item.name}<br/><b>${(item.value ?? 0).toFixed(1)} kg</b>` : "";
      },
    },
    grid: { top: 16, left: 10, right: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category", data: dates, axisTick: { show: false },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: AXIS_LABEL_STYLE,
    },
    yAxis: {
      type: "value", min: lo, max: hi, splitLine: SPLIT_LINE,
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => `${v}` },
    },
    series: [{
      type: "line", data: values, smooth: true, symbol: "circle", symbolSize: 5,
      itemStyle: { color: "#f59e0b" },
      lineStyle: { color: "#f59e0b", width: 2.5 },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: "#f59e0b28" }, { offset: 1, color: "#f59e0b00" }] } },
    }],
  };
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: { key: MetricTab; lk: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "vitals", lk: "tabVitals",  Icon: Activity   },
  { key: "steps",  lk: "tabSteps",   Icon: Footprints  },
  { key: "sleep",  lk: "tabSleep",   Icon: Moon        },
  { key: "weight", lk: "tabWeight",  Icon: Scale       },
];

// ── Main Widget ───────────────────────────────────────────────────────────────

interface VitalsChartWidgetProps {
  initialData: VitalsDataPoint[];
  initialPeriod?: ReportPeriod;
}

export function VitalsChartWidget({ initialData, initialPeriod = "7d" }: VitalsChartWidgetProps) {
  const t   = useTranslations("dashboard.vitals");
  const [period,    setPeriod]    = useState<ReportPeriod>(initialPeriod);
  const [activeTab, setActiveTab] = useState<MetricTab>("vitals");
  const [extended,  setExtended]  = useState<ExtendedVitalPoint[]>(() =>
    initialData.map((d) => ({ date: d.date, heartRate: d.heartRate, systolic: d.systolic, diastolic: d.diastolic }))
  );
  const [isPending, startTransition] = useTransition();

  // On mount, load full extended data for the default period
  useEffect(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    startTransition(async () => {
      const data = await fetchExtended(days);
      if (data.length) setExtended(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    const days = newPeriod === "7d" ? 7 : newPeriod === "30d" ? 30 : 90;
    startTransition(async () => {
      const data = await fetchExtended(days);
      setExtended(data);
    });
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    hr:       calcStats(extended.map((d) => d.heartRate)),
    systolic: calcStats(extended.map((d) => d.systolic)),
    steps:    calcStats(extended.map((d) => d.steps)),
    sleep:    calcStats(extended.map((d) => d.sleepMinutes != null ? +(d.sleepMinutes / 60).toFixed(2) : undefined)),
    weight:   calcStats(extended.map((d) => d.weightKg)),
  }), [extended]);

  const labels = { heartRate: t("heartRate"), systolic: t("bloodPressureSys"), diastolic: t("bloodPressureDia") };

  const option = useMemo<EChartsOption>(() => {
    switch (activeTab) {
      case "vitals": return buildVitalsOption(extended, labels);
      case "steps":  return buildStepsOption(extended);
      case "sleep":  return buildSleepOption(extended);
      case "weight": return buildWeightOption(extended);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, extended]);

  const isEmpty = extended.every(
    (d) => d.heartRate == null && d.systolic == null && d.steps == null && d.sleepMinutes == null && d.weightKg == null
  );

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t("title")}</p>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        <TimeRangeSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* ── Tabs (scrollable row on small screens) ── */}
      <div className="flex gap-1 px-3 pt-2.5 pb-1 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, lk, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0",
              activeTab === key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {t(lk as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* ── Stat pills ── */}
      <div className="flex gap-4 px-4 pt-1 pb-2 overflow-x-auto scrollbar-none">
        {activeTab === "vitals" && (
          <>
            <StatPill label="TB" value={stats.hr.avg}       unit="bpm"  trend={stats.hr.trend}       color={METRIC_COLORS.hr}       warnLow={60} warnHigh={100} />
            <StatPill label="Min" value={stats.hr.min}      unit="bpm"  trend="flat"                  color={METRIC_COLORS.hr}       warnLow={60} />
            <StatPill label="Max" value={stats.hr.max}      unit="bpm"  trend="flat"                  color={METRIC_COLORS.hr}       warnHigh={100} />
            <StatPill label="HA" value={stats.systolic.avg} unit="mmHg" trend={stats.systolic.trend}  color={METRIC_COLORS.systolic} warnLow={90} warnHigh={140} />
          </>
        )}
        {activeTab === "steps" && (
          <>
            <StatPill label="TB/ngày"  value={stats.steps.avg} unit="k bước" trend={stats.steps.trend}  color="#34d399" warnLow={5000} />
            <StatPill label="Cao nhất" value={stats.steps.max} unit="bước"   trend="flat"               color="#34d399" />
            <StatPill label="Thấp nhất" value={stats.steps.min} unit="bước"  trend="flat"               color="#f87171" warnLow={5000} />
          </>
        )}
        {activeTab === "sleep" && (
          <>
            <StatPill label="TB/đêm"  value={stats.sleep.avg} unit="giờ"  trend={stats.sleep.trend}  color="#a78bfa" warnLow={REF.sleep.min} warnHigh={REF.sleep.max} />
            <StatPill label="Min"     value={stats.sleep.min} unit="giờ"  trend="flat"               color="#f87171" warnLow={REF.sleep.min} />
            <StatPill label="Max"     value={stats.sleep.max} unit="giờ"  trend="flat"               color="#60a5fa" />
          </>
        )}
        {activeTab === "weight" && (
          <>
            <StatPill label="Hiện tại"
              value={extended.filter((d) => d.weightKg != null).at(-1)?.weightKg ?? null}
              unit="kg" trend={stats.weight.trend} color="#f59e0b" />
            <StatPill label="Thấp nhất" value={stats.weight.min} unit="kg" trend="flat" color="#34d399" />
            <StatPill label="Cao nhất"  value={stats.weight.max} unit="kg" trend="flat" color="#f87171" />
            <StatPill label="Thay đổi"
              value={stats.weight.max != null && stats.weight.min != null
                ? +(Math.abs(stats.weight.max - stats.weight.min)).toFixed(1)
                : null}
              unit="kg" trend="flat" color="#94a3b8" />
          </>
        )}
      </div>

      {/* ── Chart area ── */}
      <div className="flex-1 px-3 pb-3 min-h-[200px]">
        {isPending ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground gap-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            {t("loading")}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2 text-muted-foreground">
            <Activity className="w-8 h-8 opacity-30" />
            <p className="text-sm">{t("noData")}</p>
          </div>
        ) : (
          <EChartWrapper option={option} height={220} />
        )}
      </div>
    </div>
  );
}
