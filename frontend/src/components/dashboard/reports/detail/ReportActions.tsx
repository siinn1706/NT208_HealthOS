"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { Share2, TrendingUp } from "lucide-react";
import { ExportPdfInlineButton } from "@/components/dashboard/reports/ExportPdfDialog";
import { ShareReportDialog } from "@/components/dashboard/reports/ShareReportDialog";
import type { HealthReport, EmergencyContact } from "@/types/api";

const EMPTY_EMERGENCY_CONTACTS: EmergencyContact[] = [];

/**
 * Map a report category (vitals / nutrition / activity / sleep / bmi / medication)
 * onto the trend metric the trends page actually understands.
 *
 * The trends page (`<TrendMetricSelector>`) accepts a closed set of metrics:
 *   heart_rate, blood_pressure, calories, steps, sleep, bmi, weight
 *
 * Earlier we forwarded `?metric=${category}` directly, which sent values like
 * `metric=vitals` and silently broke the trend selector. (UX plan §H, P0
 * truth-and-safety fix.)
 */
function categoryToTrendMetric(category: string): string {
  switch (category) {
    case "vitals":
      return "heart_rate";
    case "nutrition":
      return "calories";
    case "activity":
      return "steps";
    case "sleep":
      return "sleep";
    case "bmi":
      return "bmi";
    case "medication":
      // No 1:1 mapping — fall through to a sensible default so the link
      // still opens a valid trend view rather than rendering an error.
      return "heart_rate";
    default:
      return "heart_rate";
  }
}

interface ReportActionsProps {
  report: HealthReport;
  category: string;
  emergencyContacts?: EmergencyContact[];
  locale: string;
}

export function ReportActions({
  report,
  category,
  emergencyContacts = EMPTY_EMERGENCY_CONTACTS,
  locale,
}: ReportActionsProps) {
  const t = useTranslations("reports");
  const [shareOpen, setShareOpen] = useState(false);

  const trendMetric = categoryToTrendMetric(category);

  return (
    <>
      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-5xl flex items-center justify-end gap-2 px-4 py-3 sm:px-6">
          {/* Trend Analysis link */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
            <Link href={`/dashboard/reports/trends?metric=${encodeURIComponent(trendMetric)}`}>
              <TrendingUp className="h-4 w-4" aria-hidden />
              {t("analyzeTrends")}
            </Link>
          </Button>

          {/* Share */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {t("share")}
          </Button>

          {/* Export PDF */}
          <ExportPdfInlineButton report={report} size="sm" />
        </div>
      </div>

      {/* Spacer so content doesn't hide behind the sticky bar */}
      <div className="h-16" aria-hidden />

      {/* Share dialog */}
      <ShareReportDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        report={report}
        emergencyContacts={emergencyContacts}
        locale={locale}
      />
    </>
  );
}
