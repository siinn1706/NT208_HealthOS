import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { Bot, Sparkles, Info } from "lucide-react";
import { ConfidenceChip } from "@/components/ui/confidence-chip";

export interface AiInsight {
  text: string;
  category?: string;
  /** Model confidence in [0, 1]. Omit when unknown. */
  confidence?: number | null;
}

interface AiInsightWidgetProps {
  insight?: AiInsight | null;
}

// Server Component
export async function AiInsightWidget({ insight }: AiInsightWidgetProps) {
  const t = await getTranslations("dashboard.ai");
  const locale = await getLocale();

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-muted-foreground" aria-hidden />
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
        {insight ? (
          <>
            <div className="flex gap-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-foreground leading-relaxed">
                {insight.text}
              </p>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden />
              <span>{t("notMedicalAdvice")}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("noInfo")}</p>
        )}

        <Link
          href={`/${locale}/dashboard/chat`}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/85 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bot className="w-3.5 h-3.5" aria-hidden />
          {t("askAI")}
        </Link>
      </div>
    </div>
  );
}
