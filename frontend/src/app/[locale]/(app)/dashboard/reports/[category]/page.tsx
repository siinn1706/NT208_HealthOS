import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { getReportSection, getHealthReport } from "@/lib/reports-data";
import { getProfileData } from "@/lib/profile-data";
import { getCategoryMeta, formatPeriodLabel } from "@/lib/report-utils";
import { KeyStatsRow } from "@/components/dashboard/reports/detail/KeyStatsRow";
import { DetailChart } from "@/components/dashboard/reports/detail/DetailChart";
import { DetailDataTable } from "@/components/dashboard/reports/detail/DetailDataTable";
import { CategoryAlertsList } from "@/components/dashboard/reports/detail/CategoryAlertsList";
import { ReportActions } from "@/components/dashboard/reports/detail/ReportActions";
import type { ReportPeriod, ReportCategory } from "@/types/api";

const VALID_CATEGORIES: ReportCategory[] = [
  "vitals",
  "nutrition",
  "activity",
  "sleep",
  "bmi",
  "medication",
];

interface DetailPageProps {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function CategoryDetailPage({ params, searchParams }: DetailPageProps) {
  const { category, locale } = await params;
  const { period: rawPeriod } = await searchParams;

  // Validate category
  if (!VALID_CATEGORIES.includes(category as ReportCategory)) {
    notFound();
  }

  const period: ReportPeriod =
    rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "7d";

  const [section, report, profile] = await Promise.all([
    getReportSection(period, category),
    getHealthReport(period),
    getProfileData(),
  ]);

  if (!section) notFound();

  const t = await getTranslations("reports");
  const meta = getCategoryMeta(category as ReportCategory);
  const CategoryIcon = meta.icon;

  const primaryStats = section.stats;
  const hasSecondary = section.data.some((d) => d.value2 !== undefined);

  return (
    <div className="space-y-6 pb-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3 w-3" aria-hidden />
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/dashboard/reports?period=${period}`} className="hover:text-foreground transition-colors">
          {t("title")}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground font-medium">{t(`categories.${category}`)}</span>
      </nav>

      {/* Section Header */}
      <header className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: meta.bgColor, color: meta.iconColor }}
          aria-hidden
        >
          <CategoryIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t(`categories.${category}`)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("period")}: {formatPeriodLabel(period)}
            {" · "}
            {section.summary}
          </p>
        </div>
      </header>

      {/* Key Stats */}
      {primaryStats && (
        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>}>
          <KeyStatsRow stats={primaryStats} />
        </Suspense>
      )}

      {/* Chart */}
      <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
        <DetailChart section={section} height={340} />
      </Suspense>

      {/* Data Table */}
      {section.data.length > 0 && (
        <DetailDataTable
          data={section.data}
          unit={primaryStats?.unit ?? ""}
          hasSecondary={hasSecondary}
        />
      )}

      {/* Alerts */}
      <Suspense fallback={<Skeleton className="h-32 rounded-xl" />}>
        <CategoryAlertsList alerts={section.alerts} />
      </Suspense>

      {/* Sticky action bar */}
      <ReportActions
        report={report}
        category={category}
        emergencyContacts={profile.emergency_contacts}
        locale={locale}
      />
    </div>
  );
}

export async function generateMetadata({ params }: DetailPageProps) {
  const { category } = await params;
  const t = await getTranslations("reports");
  const label = VALID_CATEGORIES.includes(category as ReportCategory)
    ? t(`categories.${category}`)
    : "Báo cáo";
  return { title: `${label} — HealthOS` };
}
