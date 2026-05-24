import { Suspense } from "react";
import { ProgressPageClient } from "@/components/dashboard/progress/ProgressPageClient";
import { getUserBmiData } from "@/lib/gamification-data";
import { getAggregatedMetrics } from "@/lib/analytics-data";
import type { ReportPeriod } from "@/types/api";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("goals") };
}

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-muted h-64" />;
}

interface BmiProgressPageProps {
  searchParams: Promise<{ period?: string }>;
}

const SUPPORTED_PERIODS: readonly ReportPeriod[] = ["7d", "30d", "90d"] as const;
const DEFAULT_PERIOD: ReportPeriod = "30d";

function parsePeriod(raw: string | undefined): ReportPeriod {
  if (!raw) return DEFAULT_PERIOD;
  return (SUPPORTED_PERIODS as readonly string[]).includes(raw)
    ? (raw as ReportPeriod)
    : DEFAULT_PERIOD;
}

/**
 * Translate a user-facing report window into a server-side (date_from, date_to)
 * pair so the existing aggregated endpoint can scope the query without us
 * needing the new `period=` query param landed (PR-7 will add it server-side).
 */
function periodToDateRange(period: ReportPeriod): { dateFrom: string; dateTo: string } {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const today = new Date();
  const dateTo = today.toISOString().slice(0, 10);
  const start = new Date(today.getTime() - (days - 1) * 86_400_000);
  return { dateFrom: start.toISOString().slice(0, 10), dateTo };
}

async function BmiProgressContent({
  period,
  nowIso,
}: {
  period: ReportPeriod;
  nowIso: string;
}) {
  const { dateFrom, dateTo } = periodToDateRange(period);
  const [bmiData, weightHistory] = await Promise.all([
    getUserBmiData(),
    getAggregatedMetrics("weight_kg", "daily", dateFrom, dateTo),
  ]);

  return (
    <ProgressPageClient
      bmiData={bmiData}
      weightHistory={weightHistory}
      period={period}
      nowIso={nowIso}
    />
  );
}

export default async function ProgressPage({ searchParams }: BmiProgressPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  // Compute "now" once on the server so `TodayInsightCard.interpretBmiSeries`
  // returns the same result during SSR and the first client render — avoids
  // hydration-time `data-insight-kind` mismatches when the visit straddles UTC
  // midnight or the user has a stale HTML cache.
  const nowIso = new Date().toISOString();

  return (
    <Suspense key={period} fallback={<Skeleton />}>
      <BmiProgressContent period={period} nowIso={nowIso} />
    </Suspense>
  );
}
