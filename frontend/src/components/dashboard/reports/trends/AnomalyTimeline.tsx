import { getTranslations } from "next-intl/server";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnomalyPoint } from "@/types/api";

interface AnomalyTimelineProps {
  anomalies: AnomalyPoint[];
  unit: string;
}

export async function AnomalyTimeline({ anomalies, unit }: AnomalyTimelineProps) {
  const [t, tReports] = await Promise.all([
    getTranslations("trends"),
    getTranslations("reports"),
  ]);

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("noAnomalies")}</p>
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {t("anomalies")}
        <Badge variant="outline" className="ml-2 text-[10px]">{anomalies.length}</Badge>
      </h3>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ul className="divide-y divide-border">
          {anomalies.map((a) => {
            const isCritical = a.severity === "critical";
            return (
              <li key={a.date} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle
                  className={`size-4 mt-0.5 shrink-0 ${isCritical ? "text-destructive" : "text-amber-500"}`}
                  aria-hidden
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <time
                      dateTime={a.date}
                      className="text-xs font-mono text-muted-foreground"
                    >
                      {a.date}
                    </time>
                    <Badge
                      variant={isCritical ? "destructive" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tReports(`detail.severity.${a.severity}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground mt-0.5">
                    <strong className="tabular-nums">{a.value.toLocaleString()} {unit}</strong>
                    {a.deviation_percent !== 0 && (
                      <span className="ml-1.5 text-muted-foreground">
                        ({a.deviation_percent > 0 ? "+" : ""}{a.deviation_percent.toFixed(1)}% so với trung bình)
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
