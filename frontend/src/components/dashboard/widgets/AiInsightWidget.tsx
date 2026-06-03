import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/navigation";
import { Bot, Sparkles, Info } from "lucide-react";
import { ConfidenceChip } from "@/components/ui/confidence-chip";
import type { DashboardSummary } from "@/lib/dashboard-data";
import type { DataSlice } from "@/types/data-slice";

export interface AiInsight {
  text: string;
  category?: string;
  /** Model confidence in [0, 1]. Omit when unknown. */
  confidence?: number | null;
}

interface AiInsightWidgetProps {
  summary: DataSlice<DashboardSummary>;
}

// Resolve raw i18n key from backend (e.g. "CALORIE_NORMAL") to translated string.
// Keys live at dashboard.risk.insights.*
function resolveInsightText(
  raw: string,
  tInsights: Awaited<ReturnType<typeof getTranslations<"dashboard.risk.insights">>>,
): string {
  try {
    // next-intl throws if key doesn't exist; catch and fall back to raw text
    return tInsights(raw as Parameters<typeof tInsights>[0]);
  } catch {
    return raw;
  }
}

// Server Component
export async function AiInsightWidget({ summary }: AiInsightWidgetProps) {
  const [t, tInsights, locale] = await Promise.all([
    getTranslations("dashboard.ai"),
    getTranslations("dashboard.risk.insights"),
    getLocale(),
  ]);
  const insight = summary.status === "success" ? summary.data?.aiInsight : null;
  const hasError =
    summary.status === "recoverable_error" ||
    summary.status === "hard_error" ||
    summary.status === "no_permission";

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-border">
        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {t("title")}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        {insight ? (
          <ConfidenceChip
            value={insight.confidence ?? null}
            tier={insight.confidence == null ? "unknown" : undefined}
            className="flex-shrink-0"
          />
        ) : null}
      </div>

      <div className="px-5 py-4">
        {hasError ? (
          <p className="text-sm text-muted-foreground">
            {summary.error?.message ?? t("loadError")}
          </p>
        ) : insight ? (
          <>
            <div className="flex gap-3">
              <Sparkles className="size-4 text-primary flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-foreground leading-relaxed">
                {resolveInsightText(insight.text, tInsights)}
              </p>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <Info className="size-3 mt-0.5 flex-shrink-0" aria-hidden />
              <span>{t("notMedicalAdvice")}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("noInfo")}</p>
        )}

        <Link
          href={`/dashboard/chat`}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/85 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bot className="size-3.5" aria-hidden />
          {t("askAI")}
        </Link>
      </div>
    </div>
  );
}
