"use client";

import { useState, useTransition, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { cn } from "@/lib/utils";
import type { ReportPeriod, TrendAnalysis } from "@/types/api";

// Reuse BFF proxy đã có tại /api/v1/reports/trends
async function fetchTrend(
  metric: string,
  period: ReportPeriod,
): Promise<TrendAnalysis | null> {
  const res = await fetch(
    `/api/v1/reports/trends?metric=${metric}&period=${period}`,
    { credentials: "include" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

const METRICS = [
  { key: "heart_rate", unit: "bpm",   color: "#41BCE6" },
  { key: "steps",      unit: "steps", color: "#6DE7F7" },
  { key: "sleep",      unit: "hrs",   color: "#E7DEA7" },
  { key: "calories",   unit: "kcal",  color: "#E3B79A" },
  { key: "weight",     unit: "kg",    color: "#1965B3" },
] as const;

const TREND_ICON = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

interface Props {
  initialPeriod?: ReportPeriod;
}

export function TrendSummaryWidget({ initialPeriod = "7d" }: Props) {
  const t = useTranslations("dashboard.trends");
  const locale = useLocale();
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [trends, setTrends] = useState<Record<string, TrendAnalysis>>({});
  const [isPending, startTransition] = useTransition();

  const loadTrends = (p: ReportPeriod) => {
    startTransition(async () => {
      const results = await Promise.all(
        METRICS.map((m) => fetchTrend(m.key, p)),
      );
      const map: Record<string, TrendAnalysis> = {};
      METRICS.forEach((m, i) => {
        if (results[i]) map[m.key] = results[i]!;
      });
      setTrends(map);
    });
  };

  useEffect(() => {
    loadTrends(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (p: ReportPeriod | "custom") => {
    if (p === "custom") return;
    setPeriod(p);
    loadTrends(p);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <TimeRangeSelector value={period} onChange={handlePeriodChange} />
      </div>

      <div className="px-5 py-4">
        {isPending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {METRICS.map((m) => (
              <div key={m.key} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : Object.keys(trends).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("noData")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {METRICS.map((m) => {
              const data = trends[m.key];
              if (!data) return null;
              const Icon = TREND_ICON[data.trend] ?? Minus;
              const sign = data.change_percent > 0 ? "+" : "";
              return (
                <Link
                  key={m.key}
                  href={`/${locale}/dashboard/reports/trends?metric=${m.key}&period=${period}`}
                  className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        data.trend === "improving"
                          ? "text-emerald-500"
                          : data.trend === "declining"
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t(`metrics.${m.key}` as Parameters<typeof t>[0])}
                  </p>
                  <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                    {data.data_points.length > 0
                      ? data.data_points[data.data_points.length - 1].value.toLocaleString()
                      : "--"}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      {m.unit}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-medium mt-0.5",
                      data.trend === "improving"
                        ? "text-emerald-500"
                        : data.trend === "declining"
                          ? "text-destructive"
                          : "text-muted-foreground",
                    )}
                  >
                    {sign}{data.change_percent.toFixed(1)}%
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}