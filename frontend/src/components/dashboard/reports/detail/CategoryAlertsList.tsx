import { getTranslations, getLocale } from "next-intl/server";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { getLocaleTag } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import type { ReportAlert } from "@/types/api";
import { cn } from "@/lib/utils";

interface CategoryAlertsListProps {
  alerts: ReportAlert[];
}

function SeverityIcon({ severity }: { severity: ReportAlert["severity"] }) {
  if (severity === "critical")
    return <AlertCircle className="size-4 text-destructive shrink-0" aria-hidden />;
  if (severity === "warning")
    return <AlertTriangle className="size-4 text-amber-500 shrink-0" aria-hidden />;
  return <Info className="size-4 text-[#41BCE6] shrink-0" aria-hidden />;
}

function severityVariant(severity: ReportAlert["severity"]): "destructive" | "secondary" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "secondary";
  return "outline";
}

function severityBg(severity: ReportAlert["severity"]) {
  if (severity === "critical") return "border-destructive/30 bg-destructive/5";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/5";
  return "border-[#41BCE6]/30 bg-[#41BCE6]/5";
}

export async function CategoryAlertsList({ alerts }: CategoryAlertsListProps) {
  const [t, locale] = await Promise.all([
    getTranslations("reports"),
    getLocale(),
  ]);

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-3">
        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("detail.noAlerts")}</p>
      </div>
    );
  }

  return (
    <section aria-label={t("detail.alertsSection")}>
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {t("detail.alertsSection")}
        <span className="ml-2 text-xs font-normal text-muted-foreground">({alerts.length})</span>
      </h3>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              severityBg(alert.severity)
            )}
          >
            <SeverityIcon severity={alert.severity} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <Badge variant={severityVariant(alert.severity)} className="text-[10px] px-1.5 py-0">
                  {t(`detail.severity.${alert.severity}`)}
                </Badge>
                <span className="text-xs font-medium text-foreground truncate">{alert.metric}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                <span>
                  {t("detail.alertValue")}:{" "}
                  <strong className="text-foreground">
                    {typeof alert.value === "number" ? alert.value : "—"} {alert.unit}
                  </strong>
                </span>
                {typeof alert.threshold === "number" && alert.threshold > 0 && (
                  <span>
                    {t("detail.alertThreshold")}: {alert.threshold} {alert.unit}
                  </span>
                )}
                {alert.timestamp ? (
                  <time dateTime={alert.timestamp}>
                    {new Date(alert.timestamp).toLocaleString(getLocaleTag(locale), {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
