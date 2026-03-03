import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FileText, Download, Share2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listRecentReports } from "@/lib/reports-data";
import { statusBadgeVariant, statusColor, formatReportDate, formatPeriodLabel } from "@/lib/report-utils";
import type { HealthStatus, ReportPeriod } from "@/types/api";

interface RecentReportsListProps {
  locale: string;
}

export async function RecentReportsList({ locale }: RecentReportsListProps) {
  const t = await getTranslations("reports");
  const reports = await listRecentReports();

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("noRecentReports")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("recentReports")}</h3>
      </div>
      {reports.map((report, idx) => (
        <div key={report.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
          {/* Icon */}
          <div className="shrink-0 rounded-lg border border-border bg-muted/50 p-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Báo cáo {formatPeriodLabel(report.period)}
              </span>
              <Badge
                variant={statusBadgeVariant(report.status as HealthStatus)}
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {report.alert_count > 0
                  ? `${report.alert_count} cảnh báo`
                  : t("statusNormal")}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatReportDate(report.generated_at)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Tải xuống PDF"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Chia sẻ báo cáo"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Link
              href={`/${locale}/dashboard/reports?period=${report.period}`}
              aria-label="Xem báo cáo"
            >
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
