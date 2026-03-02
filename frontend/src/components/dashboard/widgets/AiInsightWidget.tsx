import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";

export interface AiInsight {
  text: string;
  category?: string;
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
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">
            {t("title")}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {insight ? (
          <div className="flex gap-3">
            <Sparkles className="w-4 h-4 text-[#6DE7F7] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              {insight.text}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("loading")}</p>
        )}

        <Link
          href={`/${locale}/dashboard/ai-chat`}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-[#1A4474] transition-colors duration-200"
        >
          <Bot className="w-3.5 h-3.5" />
          {t("askAI")}
        </Link>
      </div>
    </div>
  );
}
