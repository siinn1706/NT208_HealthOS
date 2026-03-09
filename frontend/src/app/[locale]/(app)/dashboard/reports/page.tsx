import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FileBarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { getHealthReport } from "@/lib/reports-data";
import { ReportCategoryGrid } from "@/components/dashboard/reports/ReportCategoryGrid";
import { RecentReportsList } from "@/components/dashboard/reports/RecentReportsList";
import { ReportPeriodSelector } from "@/components/dashboard/reports/ReportPeriodSelector";
import { ReportHubWrapper } from "@/components/dashboard/reports/ReportHubWrapper";
import type { ReportPeriod } from "@/types/api";
import { getProfileData } from "@/lib/profile-data";

interface ReportsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <Skeleton className="h-4 w-32" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-5 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage(props: ReportsPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { locale } = params;

  const t = await getTranslations("reports");

  const period: ReportPeriod = (["7d", "30d", "90d"].includes(searchParams.period ?? "")
    ? searchParams.period
    : "7d") as ReportPeriod;

  // Parallel data fetch
  const [report, profile] = await Promise.all([
    getHealthReport(period),
    getProfileData(),
  ]);

  const emergencyContacts = profile?.emergency_contacts ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>

        {/* Period selector */}
        <ReportPeriodSelector value={period} />
      </div>

      {/* ── Client wrapper: auto-share banner + quick actions + dialogs ── */}
      <ReportHubWrapper
        report={report}
        emergencyContacts={emergencyContacts}
        locale={locale}
      />

      {/* ── Category cards grid ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Tổng quan theo danh mục</h2>
        <Suspense fallback={<GridSkeleton />}>
          <ReportCategoryGrid
            sections={report.sections}
            locale={locale}
            period={period}
          />
        </Suspense>
      </div>

      {/* ── Recent reports ── */}
      <Suspense fallback={<ListSkeleton />}>
        <RecentReportsList locale={locale} />
      </Suspense>
    </div>
  );
}
