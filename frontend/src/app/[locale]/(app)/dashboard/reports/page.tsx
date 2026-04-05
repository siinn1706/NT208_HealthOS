"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FileBarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { KpiDonutChart } from "@/components/charts/KpiDonutChart";
import type { ReportPeriod } from "@/types/api";

async function fetchAggregatedKpi(metric: string, period: ReportPeriod) {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const res = await fetch(
    `/api/v1/analytics/aggregated?metric_type=${metric}&period=daily&date_from=${getDateFrom(days)}&date_to=${getDateTo()}`,
    { credentials: "include" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? [];
}

function getDateFrom(days: number): string {
  return new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
}

function getDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

interface KpiData {
  heartRate: { avg: number; target: number };
  steps: { avg: number; target: number };
  sleep: { avg: number; target: number };
  weight: { avg: number; target: number };
}

function KpiCard({
  label,
  value,
  unit,
  target,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  target: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
      <KpiDonutChart value={value} target={target} color={color} size={80} />
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {value.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const t = useTranslations("dashboard.reports");
  const kpiT = useTranslations("dashboard.kpi");
  const [period, setPeriod] = useState<ReportPeriod>("7d");

  const KPI_CONFIGS = [
    { key: "heartRate" as const, label: t("heartRateAvg"), unit: kpiT("heartUnit"), target: 80, color: "#EF4444" },
    { key: "steps" as const, label: t("stepsAvg"), unit: kpiT("stepsUnit"), target: 8000, color: "#41BCE6" },
    { key: "sleep" as const, label: t("sleepAvg"), unit: kpiT("sleepUnit"), target: 8, color: "#A78BFA" },
    { key: "weight" as const, label: t("weightAvg"), unit: "kg", target: 70, color: "#16A34A" },
  ];
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadKpis = (p: ReportPeriod) => {
    startTransition(async () => {
      const [hrData, stepsData, sleepData, weightData] = await Promise.all([
        fetchAggregatedKpi("heart_rate", p),
        fetchAggregatedKpi("steps", p),
        fetchAggregatedKpi("sleep_minutes", p),
        fetchAggregatedKpi("weight_kg", p),
      ]);

      const avg = (arr: Array<{ avg_value?: number }>) => {
        const vals = arr.filter((a) => typeof a.avg_value === "number").map((a) => a.avg_value!);
        if (vals.length === 0) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };

      const hrAvg = avg(Array.isArray(hrData) ? hrData : []);
      const stepsAvg = avg(Array.isArray(stepsData) ? stepsData : []);
      // sleep is in minutes, convert to hours
      const sleepAvg = avg(Array.isArray(sleepData) ? sleepData : []) / 60;
      const weightAvg = avg(Array.isArray(weightData) ? weightData : []);

      setKpiData({
        heartRate: { avg: hrAvg, target: 80 },
        steps: { avg: stepsAvg, target: 8000 },
        sleep: { avg: sleepAvg, target: 8 },
        weight: { avg: weightAvg, target: 70 },
      });
    });
  };

  // Initial load — must be useEffect, NOT useState, to avoid calling startTransition during render
  useEffect(() => {
    loadKpis("7d");
  }, []);

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    loadKpis(newPeriod);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        <TimeRangeSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* ── KPI Summary Charts ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("kpiOverview")}</h2>
        {isPending && !kpiData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Nhịp tim TB"
              value={kpiData?.heartRate.avg ?? 0}
              unit="bpm"
              target={kpiData?.heartRate.target ?? 80}
              color="#EF4444"
            />
            <KpiCard
              label="Số bước TB"
              value={kpiData?.steps.avg ?? 0}
              unit="bước"
              target={kpiData?.steps.target ?? 8000}
              color="#41BCE6"
            />
            <KpiCard
              label="Giấc ngủ TB"
              value={kpiData?.sleep.avg ?? 0}
              unit="giờ"
              target={kpiData?.sleep.target ?? 8}
              color="#A78BFA"
            />
            <KpiCard
              label="Cân nặng TB"
              value={kpiData?.weight.avg ?? 0}
              unit="kg"
              target={kpiData?.weight.target ?? 70}
              color="#16A34A"
            />
          </div>
        )}
      </div>

      {/* ── Placeholder for existing report content ── */}
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("detailedInDev")}
      </div>
    </div>
  );
}
