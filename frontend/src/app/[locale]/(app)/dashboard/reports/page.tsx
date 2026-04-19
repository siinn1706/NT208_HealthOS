import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { FileBarChart2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { KpiOverview } from "@/components/dashboard/reports/KpiOverview";
import { ReportHubWrapper } from "@/components/dashboard/reports/ReportHubWrapper";
import { PdfDownloadHandler } from "@/components/dashboard/reports/PdfDownloadHandler";
import { PageHeader } from "@/components/shared/page";

import { getHealthReport } from "@/lib/reports-data";
import { getProfileData } from "@/lib/profile-data";
import type { ReportPeriod } from "@/types/api";

interface ReportsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}

/**
 * Reports Hub (UX plan §H).
 *
 * Server Component shell — fetches the active health report + emergency
 * contacts so we can hand them to <ReportHubWrapper> (which manages the
 * share / export dialogs and the auto-share countdown banner). The KPI
 * strip stays a Client Component because it owns its own period state and
 * re-fetches in place.
 */
export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { locale } = await params;
  const { period: rawPeriod } = await searchParams;

  const period: ReportPeriod =
    rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "7d";

  const [t, report, profile] = await Promise.all([
    getTranslations("dashboard.reports"),
    getHealthReport(period),
    getProfileData(),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("title")}
          </span>
        }
        description={t("subtitle")}
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        }
      >
        <KpiOverview initialPeriod={period} />
      </Suspense>

      {/* Auto-share banner + share/export quick actions live inside the wrapper
          so the page itself can stay a Server Component. */}
      <ReportHubWrapper
        report={report}
        emergencyContacts={profile.emergency_contacts}
        locale={locale}
      />

      {/* B7 P10 — auto-opens the signed download URL when the user clicks the
          "Your PDF report is ready" notification (deep-link `?pdf=<id>`). */}
      <Suspense fallback={null}>
        <PdfDownloadHandler />
      </Suspense>

      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("detailedInDev")}
      </div>
      </div>
    </>
  );
}
