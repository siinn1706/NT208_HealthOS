"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

import { getUnitLabel } from "@/lib/format-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { KpiDonutChart } from "@/components/charts/KpiDonutChart";
import type { ReportPeriod } from "@/types/api";

/**
 * Reports hub KPI strip.
 *
 * Pulled out of the hub page so the page itself can be a Server Component
 * (which is required for `<ReportHubWrapper>` — see UX plan §H). The KPIs
 * still need client interactivity (period switch, in-place reload), so they
 * live here behind their own boundary.
 */

interface KpiData {
  heartRate: { avg: number | null; target: number };
  steps:     { avg: number | null; target: number };
  sleep:     { avg: number | null; target: number };
  weight:    { avg: number | null; target: number };
}

async function fetchAggregatedKpi(metric: string, period: ReportPeriod) {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const res = await fetch(
    `/api/v1/analytics/aggregated?metric_type=${metric}&period=daily&date_from=${getDateFrom(days)}&date_to=${getDateTo()}`,
    { credentials: "include" },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? [];
}

function getDateFrom(days: number): string {
  return new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
}

function getDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({
  label,
  value,
  unit,
  target,
  color,
  emptyLabel,
}: {
  label: string;
  value: number | null;
  unit: string;
  target: number;
  color: string;
  emptyLabel: string;
}) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
      {hasValue ? (
        <KpiDonutChart value={value as number} target={target} color={color} size={80} />
      ) : (
        <div
          className="size-[80px] rounded-full border-[6px] border-muted/40"
          role="img"
          aria-label={emptyLabel}
        />
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {hasValue ? (
            <>
              {(value as number).toFixed(0)}{" "}
              <span className="text-xs font-normal text-muted-foreground">{unit}</span>
            </>
          ) : (
            "--"
          )}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface KpiOverviewProps {
  initialPeriod?: ReportPeriod;
}

export function KpiOverview({ initialPeriod = "7d" }: KpiOverviewProps) {
  const t = useTranslations("dashboard.reports");
  const locale = useLocale();
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isPending, startTransition] = useTransition();

  const KPI_CONFIGS = [
    { key: "heartRate" as const, label: t("heartRateAvg"), unit: "bpm",                          target: 80,   color: "#EF4444" },
    { key: "steps"     as const, label: t("stepsAvg"),     unit: getUnitLabel("steps", locale),  target: 8000, color: "#41BCE6" },
    { key: "sleep"     as const, label: t("sleepAvg"),     unit: getUnitLabel("hours", locale),  target: 8,    color: "#A78BFA" },
    { key: "weight"    as const, label: t("weightAvg"),    unit: "kg",                           target: 70,   color: "#16A34A" },
  ] as const;

  const loadKpis = (p: ReportPeriod) => {
    startTransition(async () => {
      const [hrData, stepsData, sleepData, weightData] = await Promise.all([
        fetchAggregatedKpi("heart_rate", p),
        fetchAggregatedKpi("steps", p),
        fetchAggregatedKpi("sleep_minutes", p),
        fetchAggregatedKpi("weight_kg", p),
      ]);

      // Returns `null` when the upstream window has no readings — this keeps
      // empty states honest instead of rendering a 0-filled donut.
      const avg = (arr: Array<{ avg_value?: number }>): number | null => {
        const vals = arr
          .filter((a) => typeof a.avg_value === "number")
          .map((a) => a.avg_value!);
        if (vals.length === 0) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };

      const hrAvg = avg(Array.isArray(hrData) ? hrData : []);
      const stepsAvg = avg(Array.isArray(stepsData) ? stepsData : []);
      const sleepRaw = avg(Array.isArray(sleepData) ? sleepData : []);
      const sleepAvg = sleepRaw === null ? null : sleepRaw / 60;
      const weightAvg = avg(Array.isArray(weightData) ? weightData : []);

      setKpiData({
        heartRate: { avg: hrAvg, target: 80 },
        steps:     { avg: stepsAvg, target: 8000 },
        sleep:     { avg: sleepAvg, target: 8 },
        weight:    { avg: weightAvg, target: 70 },
      });
    });
  };

  // Initial load — must run inside `useEffect` so we don't kick off the
  // transition during render (which would warn in React 19 strict mode).
  useEffect(() => {
    loadKpis(initialPeriod);
  }, [initialPeriod]);

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    loadKpis(newPeriod);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{t("kpiOverview")}</h2>
        <TimeRangeSelector value={period} onChange={handlePeriodChange} />
      </div>
      {isPending && !kpiData ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {KPI_CONFIGS.map((cfg) => (
            <KpiCard
              key={cfg.key}
              label={cfg.label}
              value={kpiData ? kpiData[cfg.key].avg : null}
              unit={cfg.unit}
              target={cfg.target}
              color={cfg.color}
              emptyLabel={t("noData")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
