import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { getTrendAnalysis } from "@/lib/reports-data";
import { TrendChart } from "@/components/dashboard/reports/trends/TrendChart";
import { TrendMetricSelector } from "@/components/dashboard/reports/trends/TrendMetricSelector";
import { AnomalyTimeline } from "@/components/dashboard/reports/trends/AnomalyTimeline";
import { TrendAiSummary } from "@/components/dashboard/reports/trends/TrendAiSummary";
import { MetricComparePanel } from "@/components/dashboard/reports/trends/MetricComparePanel";
import { TrendExportBar } from "@/components/dashboard/reports/trends/TrendExportBar";
import type { ReportPeriod } from "@/types/api";

const COMPARE_METRICS = ["heart_rate", "steps", "sleep", "bmi", "calories", "weight", "blood_pressure"];

interface TrendsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metric?: string; period?: string }>;
}

export default async function TrendsPage(props: TrendsPageProps) {
  const searchParams = await props.searchParams;
  const { metric: rawMetric, period: rawPeriod } = searchParams;

  const metric = rawMetric ?? "heart_rate";
  const period: ReportPeriod =
    rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "7d";

  const t = await getTranslations("trends");

  // Fetch primary analysis + comparison metrics in parallel
  const compareList = COMPARE_METRICS.filter((m) => m !== metric).slice(0, 3);
  const [analysis, ...comparisons] = await Promise.all([
    getTrendAnalysis(metric, period),
    ...compareList.map((m) => getTrendAnalysis(m, period)),
  ]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3 w-3" aria-hidden />
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          {t("title").replace("Phân tích xu hướng", "Báo cáo")}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground font-medium">{t("title")}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <TrendExportBar analysis={analysis} />
      </div>

      {/* Metric + Period selector */}
      <TrendMetricSelector metric={metric} period={period} />

      {/* AI Summary */}
      <Suspense fallback={<Skeleton className="h-28 rounded-xl" />}>
        <TrendAiSummary analysis={analysis} />
      </Suspense>

      {/* Main trend chart */}
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <TrendChart analysis={analysis} height={380} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Anomaly timeline */}
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <AnomalyTimeline anomalies={analysis.anomalies} unit={analysis.unit} />
        </Suspense>

        {/* Metric compare panel */}
        {comparisons.length > 0 && (
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MetricComparePanel primary={analysis} comparisons={comparisons} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Phân tích xu hướng — HealthOS" };
}
