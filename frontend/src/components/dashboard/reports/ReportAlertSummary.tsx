import { AlertTriangle, AlertOctagon, FileText, Share2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import type { ReportAlert, HealthStatus } from "@/types/api";
import { statusBgColor } from "@/lib/report-utils";

interface ReportAlertSummaryProps {
  alerts: ReportAlert[];
  status: HealthStatus;
  locale: string;
}

export async function ReportAlertSummary({
  alerts,
  status,
  locale,
}: ReportAlertSummaryProps) {
  if (status === "normal" || alerts.length === 0) return null;

  const t = await getTranslations("reports");

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount  = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${statusBgColor(status)}`}
      role="alert"
    >
      {/* Icon */}
      <div className="shrink-0">
        {status === "critical" ? (
          <AlertOctagon className="size-6 text-destructive" aria-hidden />
        ) : (
          <AlertTriangle className="size-6 text-amber-500" aria-hidden />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${status === "critical" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
          {status === "critical"
            ? `Phát hiện ${criticalCount} cảnh báo nghiêm trọng`
            : `Phát hiện ${warningCount} cảnh báo cần chú ý`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
          {alerts[0]?.message}
          {alerts.length > 1 && ` và ${alerts.length - 1} cảnh báo khác.`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <Link href={`/dashboard/reports`}>
            <FileText className="size-3.5" aria-hidden />
            {t("viewDetail")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1.5">
          <Link href={`/dashboard/reports?share=1`}>
            <Share2 className="size-3.5" aria-hidden />
            {t("share")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
