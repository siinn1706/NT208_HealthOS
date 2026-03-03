import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { TrendAnalysis } from "@/types/api";
import { trendColor } from "@/lib/report-utils";

interface TrendAiSummaryProps {
  analysis: TrendAnalysis;
}

export async function TrendAiSummary({ analysis }: TrendAiSummaryProps) {
  const t = await getTranslations("trends");

  const TrendIcon =
    analysis.trend === "improving"
      ? TrendingUp
      : analysis.trend === "declining"
        ? TrendingDown
        : Minus;

  const changeSign = analysis.change_percent > 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-[#41BCE6]/40 bg-gradient-to-br from-[#41BCE6]/8 to-transparent p-5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#41BCE6]/15">
          <Sparkles className="h-5 w-5 text-[#41BCE6]" aria-hidden />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t("aiSummary")}</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#41BCE6]/40 text-[#41BCE6]">
              AI
            </Badge>
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor(analysis.trend)}`}>
              <TrendIcon className="h-3.5 w-3.5" aria-hidden />
              {changeSign}{analysis.change_percent.toFixed(1)}%
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.ai_summary}</p>

          <p className="mt-2 text-[11px] text-muted-foreground/60 italic">
            * Đây là nhận xét được tạo tự động từ mô hình AI dựa trên dữ liệu gần nhất.
          </p>
        </div>
      </div>
    </div>
  );
}
