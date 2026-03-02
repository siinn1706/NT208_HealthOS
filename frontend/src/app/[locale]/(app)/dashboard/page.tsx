import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AlertBannerWidget } from "@/components/dashboard/widgets/AlertBannerWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { KpiRingWidget } from "@/components/dashboard/widgets/KpiRingWidget";
import { VitalsChartWidget } from "@/components/dashboard/widgets/VitalsChartWidget";
import { UpcomingRemindersWidget } from "@/components/dashboard/widgets/UpcomingRemindersWidget";
import { GoalProgressWidget } from "@/components/dashboard/widgets/GoalProgressWidget";
import { AiInsightWidget } from "@/components/dashboard/widgets/AiInsightWidget";

import {
  getDashboardSummary,
  getVitalsTimeseries,
  getUpcomingReminders,
} from "@/lib/dashboard-data";

// Skeleton loading state for chart-heavy widget
function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card h-[340px] animate-pulse" />
  );
}

// Server Component — data fetch happens here, not in widgets
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  // Parallel data fetch on the server
  const [summary, vitals, reminders] = await Promise.all([
    getDashboardSummary(),
    getVitalsTimeseries(),
    getUpcomingReminders(),
  ]);

  // Detect time of day for greeting
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? "greeting" : hour < 18 ? "greetingAfternoon" : "greetingEvening";

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {t(greetingKey as Parameters<typeof t>[0])}, {summary.userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("overview")}
        </p>
      </div>

      {/* ── Row 0: Alert Banner (full-width, conditional) ── */}
      {summary.alerts.length > 0 && (
        <AlertBannerWidget alerts={summary.alerts} />
      )}

      {/* ── Row 1: KPI Rings ── */}
      <KpiRingWidget data={summary.kpis} />

      {/* ── Row 2: Quick Actions ── */}
      <QuickActionsWidget />

      {/* ── Row 3: Vitals Chart + Reminders ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Vitals chart — spans 2 of 3 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <VitalsChartWidget data={vitals} />
          </Suspense>
        </div>

        {/* Upcoming reminders — 1 column */}
        <div className="min-h-[320px]">
          <UpcomingRemindersWidget reminders={reminders} />
        </div>
      </div>

      {/* ── Row 4: Goal Progress + AI Insight ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <GoalProgressWidget goals={summary.goals} />
        <AiInsightWidget insight={summary.aiInsight} />
      </div>
    </div>
  );
}
