"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, Scale, Ruler } from "lucide-react";
import { BmiProgressChart } from "@/components/charts/BmiProgressChart";
import type { UserBmiData } from "@/data/gamification";
import { HealthGoalDialog } from "./HealthGoalDialog";
import { TodayInsightCard } from "./TodayInsightCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FreshnessChip } from "@/components/ui/freshness-chip";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page";
import type { AggregationPoint, ReportPeriod } from "@/types/api";
import type { SavedGoal } from "./save-health-goal-action";
import { track } from "@/lib/analytics";

interface ProgressPageClientProps {
  bmiData: UserBmiData;
  weightHistory: AggregationPoint[];
  /** Selected report window — propagated from server via `searchParams.period`. */
  period: ReportPeriod;
  /** Server-rendered "now" — keeps insight interpretation hydration-stable. */
  nowIso: string;
}

function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Derive targetBMI from goal data + current height */
function deriveTargetBmi(goal: SavedGoal, heightCm: number | null): number | null {
  if (goal.target_weight_kg && heightCm && heightCm > 0) {
    const hm = heightCm / 100;
    return parseFloat((goal.target_weight_kg / (hm * hm)).toFixed(1));
  }
  return null;
}

export function ProgressPageClient({
  bmiData: initialData,
  weightHistory,
  period,
  nowIso,
}: ProgressPageClientProps) {
  const t = useTranslations("progress");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startPeriodTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Lift into client state so we can apply saved goals directly
  const [bmiData, setBmiData] = useState<UserBmiData>(initialData);

  const heightM = (bmiData.heightCm ?? 0) / 100;
  const hasHeight = bmiData.heightCm != null && bmiData.heightCm > 0;
  // Without a height we cannot derive BMI. Returning [] (instead of mapping
  // every reading to bmi: 0) prevents the chart and "Today's insight" card
  // from drawing a fake flat-zero line that reads as a real measurement.
  // See plan §B2 — "BMI plotted as 0 when height is missing".
  const bmiHistory = useMemo(
    () =>
      hasHeight
        ? weightHistory.map((w: AggregationPoint) => ({
            date: w.date,
            bmi: parseFloat((w.avg_value / (heightM * heightM)).toFixed(1)),
          }))
        : [],
    [weightHistory, hasHeight, heightM]
  );

  // Newest reading drives the FreshnessChip on the metric cards. Until Core
  // ships `last_reading_at` on the aggregated payload (PR-7), we read it off
  // the latest history point.
  const lastReadingDate = bmiHistory.length > 0 ? bmiHistory[bmiHistory.length - 1].date : null;
  const lastReadingIso = lastReadingDate ? `${lastReadingDate}T00:00:00Z` : null;

  const daysRemaining = getDaysRemaining(bmiData.deadline);
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  const handlePeriodChange = useCallback(
    (next: ReportPeriod | "custom") => {
      // Custom ranges need server-side date_from/date_to plumbing through
      // searchParams + getAggregatedMetrics, which lands with PR-7. Until
      // then, surface an explicit "coming soon" toast instead of silently
      // dropping the user's selection (which previously left the popover
      // closed but the chart unchanged — pure UX trap).
      if (next === "custom") {
        toast.info(t("customRangeUnavailable"));
        return;
      }
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("period", next);
      track("progress.period.changed", { period: next });
      startPeriodTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, t]
  );

  function handleGoalSaved(goal: SavedGoal) {
    setBmiData((prev) => {
      // Height stays as-is — comes from user profile, not health goal
      return {
        ...prev,
        goalId: goal.id,
        targetWeightKg: goal.target_weight_kg,
        targetBmi: deriveTargetBmi(goal, prev.heightCm),
        deadline: goal.deadline,
      };
    });
  }

  return (
    <>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        primaryAction={
          <Button
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer shrink-0"
          >
            {bmiData.goalId ? t("editGoal") : t("setGoal")}
          </Button>
        }
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Today's interpretive insight — calm one-sentence read of the trend */}
      <TodayInsightCard
        series={bmiHistory}
        targetBmi={bmiData.targetBmi}
        nowIso={nowIso}
        onAction={() => setDialogOpen(true)}
      />

      {/* Time range selector — wires `?period=` URL state */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">{t("rangeLabel")}</p>
        <TimeRangeSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* Metric cards: BMI, Weight, Height — current + target */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* BMI Card */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {bmiData.bmi != null ? bmiData.bmi.toFixed(1) : "--"}
              </span>
              <span className="text-2xl font-bold text-muted-foreground">/</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {bmiData.targetBmi != null ? bmiData.targetBmi.toFixed(1) : "--"}
              </span>
              {daysRemaining !== null && (
                <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0.5 shrink-0">
                  {isOverdue ? t("overdue") : t("daysRemaining").replace("X", String(daysRemaining))}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{t("bmi")}</p>
              {lastReadingIso && <FreshnessChip recordedAt={lastReadingIso} />}
            </div>
          </div>
        </div>

        {/* Weight Card */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {bmiData.weightKg != null ? bmiData.weightKg.toFixed(1) : "--"}
              </span>
              <span className="text-2xl font-bold text-muted-foreground">/</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {bmiData.targetWeightKg != null ? bmiData.targetWeightKg.toFixed(1) : "--"}
              </span>
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{t("cardWeight")}</p>
              {lastReadingIso && <FreshnessChip recordedAt={lastReadingIso} />}
            </div>
          </div>
        </div>

        {/* Height Card */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {bmiData.heightCm != null ? bmiData.heightCm : "--"}
              </span>
              <span className="text-sm text-muted-foreground">cm</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("cardHeight")}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
          {t("legendCurrent")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 shrink-0" />
          {t("legendTarget")}
        </span>
      </div>

      {/* BMI progress chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t("bmiChart")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("chartSubtitle")}
          </p>
        </div>
        {bmiHistory.length > 0 ? (
          <BmiProgressChart bmiData={bmiData} historyData={bmiHistory} height={280} />
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            {t("chartNoData")}
          </div>
        )}
      </div>

      {/* BMI status info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("bmiInfo")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("classification")}</p>
            <p className="font-medium text-foreground">{(t as (key: string) => string)(`bmiCategory.${bmiData.status}`)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">{t("targetWeight")}</p>
            <p className="font-medium text-foreground">
              {bmiData.targetWeightKg != null ? `${bmiData.targetWeightKg.toFixed(1)} kg` : "--"}
            </p>
          </div>
          {/*
            `bmiScore` is rendered only when Core returns a real value. Until
            then, hide the row entirely (rather than showing "--/100" which
            implies a known-but-zero score). Restore the block once PR-7's
            scoring lands BE-side.
          */}
          {bmiData.bmiScore != null && (
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("bmiScore")}</p>
              <p className="font-medium text-foreground">{bmiData.bmiScore} / 100</p>
            </div>
          )}
        </div>
      </div>

      {/* Health Goal Dialog */}
      <HealthGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialGoal={bmiData}
        onSaved={handleGoalSaved}
      />
      </div>
    </>
  );
}
