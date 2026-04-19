import { Sparkles, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ConfidenceChip } from "@/components/ui/confidence-chip";
import type { TrendAnalysis } from "@/types/api";
import { trendColor } from "@/lib/report-utils";

interface TrendAiSummaryProps {
  analysis: TrendAnalysis;
  /** Optional model confidence in [0, 1]; renders an "unknown" chip when omitted. */
  confidence?: number | null;
}

export async function TrendAiSummary({ analysis, confidence }: TrendAiSummaryProps) {
  const t = await getTranslations("trends");

  const TrendIcon =
    analysis.trend === "improving"
      ? TrendingUp
      : analysis.trend === "declining"
        ? TrendingDown
        : Minus;

  const changeSign = analysis.change_percent > 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/8 to-transparent p-5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t("aiSummary")}</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
              AI
            </Badge>
            <ConfidenceChip
              value={confidence ?? null}
              tier={confidence == null ? "unknown" : undefined}
            />
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor(analysis.trend)}`}>
              <TrendIcon className="h-3.5 w-3.5" aria-hidden />
              {changeSign}{analysis.change_percent.toFixed(1)}%
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.ai_summary}</p>

          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground/80 leading-snug">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{t("aiDisclaimer")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
