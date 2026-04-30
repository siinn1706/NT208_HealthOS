import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { RealtimeAnomalyWidget } from "@/components/dashboard/widgets/RealtimeAnomalyWidget";
import { AlertBannerWidget } from "@/components/dashboard/widgets/AlertBannerWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { KpiRingWidget } from "@/components/dashboard/widgets/KpiRingWidget";
import { VitalsChartWidget } from "@/components/dashboard/widgets/VitalsChartWidget";
import { UpcomingRemindersWidget } from "@/components/dashboard/widgets/UpcomingRemindersWidget";
import { GoalProgressWidget } from "@/components/dashboard/widgets/GoalProgressWidget";
import { AiInsightWidget } from "@/components/dashboard/widgets/AiInsightWidget";
import { WeeklyCalorieChartWidget } from "@/components/dashboard/widgets/WeeklyCalorieChartWidget";
import { TodayDosesPanel } from "@/components/dashboard/medications/TodayDosesPanel";
import { PageHeader } from "@/components/shared/page";
import { ExerciseSuggestionsWidget } from "@/components/dashboard/widgets/ExerciseSuggestionsWidget";

import {
  getDashboardSummary,
  getVitalsTimeseries,
  getUpcomingReminders,
  getExerciseSuggestions,
} from "@/lib/dashboard-data";
import type { ReportPeriod } from "@/types/api";
import { TrendSummaryWidget } from "@/components/dashboard/widgets/TrendSummaryWidget";

// Skeleton loading state for chart-heavy widget
function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card h-[340px] animate-pulse" />
  );
}

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period = (["7d", "30d", "90d"].includes(params.period ?? "")
    ? params.period
    : "7d") as ReportPeriod;

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const t = await getTranslations("dashboard");

  // Parallel data fetch on the server
 const [summary, vitals, reminders, exerciseSuggestions] = await Promise.all([
    getDashboardSummary(),
    getVitalsTimeseries(days),
    getUpcomingReminders(),
    getExerciseSuggestions(),
  ]);

  // Detect time of day for greeting
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? "greeting" : hour < 18 ? "greetingAfternoon" : "greetingEvening";

  return (
    <>
      <PageHeader
        title={`${t(greetingKey as Parameters<typeof t>[0])}, ${summary.userName}`}
        description={t("overview")}
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Row 0: Alert Banner (full-width, conditional) ── */}
      {summary.alerts.length > 0 && (
        <AlertBannerWidget alerts={summary.alerts} />
      )}

      {/* ── Row 0b: Anomaly Alerts (realtime + historical) ── */}
      <RealtimeAnomalyWidget />

      {/* ── Row 1: KPI Rings ── */}
      <KpiRingWidget data={summary.kpis} />

      {/* ── Row 2: Quick Actions ── */}
      <QuickActionsWidget />

      {/* ── Row 3: Vitals Chart + Reminders ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Vitals chart — spans 2 of 3 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <VitalsChartWidget initialData={vitals} initialPeriod={period} />
          </Suspense>
        </div>

        {/* Upcoming reminders + Today's doses — 1 column */}
        <div className="min-h-[320px] space-y-5">
          <UpcomingRemindersWidget reminders={reminders} />
          <TodayDosesPanel limit={3} variant="card" />
        </div>
      </div>

       {/* ── Row 4: Trend Summary ── */}
      <TrendSummaryWidget initialPeriod={period} />

      {/* Row 5: Weekly Calorie Chart */}
      <WeeklyCalorieChartWidget initialPeriod={period} />

      {/* Row 6: Goals + AI Insight + Exercise Suggestions */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <GoalProgressWidget goals={summary.goals} />
        <AiInsightWidget insight={summary.aiInsight} />
        <ExerciseSuggestionsWidget suggestions={exerciseSuggestions} />
      </div>
      </div>
    </>
  );
}
