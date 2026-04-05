"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Lightbulb,
  Target,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { NutritionSuggestion, NutritionSuggestionType } from "@/types/api";

interface NutritionSuggestionsWidgetProps {
  suggestions: NutritionSuggestion[];
}

type TypeKey = NutritionSuggestionType;

function NutritionSuggestionsWidget({ suggestions }: NutritionSuggestionsWidgetProps) {
  const t = useTranslations("dashboard.nutrition");

  const cfgMap: Record<
    TypeKey,
    {
      icon: React.ComponentType<{ className?: string }>;
      bg: string;
      iconColor: string;
      badgeBg: string;
      badgeText: string;
      labelKey: Parameters<ReturnType<typeof useTranslations<TypeKey>>>[0];
    }
  > = {
    warning: {
      icon: AlertTriangle,
      bg: "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40",
      iconColor: "text-red-500",
      badgeBg: "bg-red-100 dark:bg-red-900/40",
      badgeText: "text-red-600 dark:text-red-400",
      labelKey: "types.warning",
    },
    tip: {
      icon: Lightbulb,
      bg: "bg-[#41BCE6]/8 dark:bg-[#41BCE6]/10 border-[#41BCE6]/25 dark:border-[#41BCE6]/30",
      iconColor: "text-[#41BCE6]",
      badgeBg: "bg-[#41BCE6]/15",
      badgeText: "text-[#1a8ab3] dark:text-[#41BCE6]",
      labelKey: "types.tip",
    },
    goal: {
      icon: Target,
      bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
      iconColor: "text-amber-500",
      badgeBg: "bg-amber-100 dark:bg-amber-900/40",
      badgeText: "text-amber-600 dark:text-amber-400",
      labelKey: "types.goal",
    },
    success: {
      icon: CheckCircle2,
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40",
      iconColor: "text-emerald-500",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      labelKey: "types.success",
    },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* List */}
      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <CheckCircle2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-center text-muted-foreground">
            {t("noData")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {suggestions.map((s) => {
            const cfg = cfgMap[s.type];
            const Icon = cfg.icon;

            return (
              <li
                key={s.id}
                className={cn(
                  "rounded-lg border p-3 flex gap-3 items-start",
                  cfg.bg
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
                    cfg.badgeBg
                  )}
                >
                  <Icon className={cn("size-3.5", cfg.iconColor)} />
                </span>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        cfg.badgeBg,
                        cfg.badgeText
                      )}
                    >
                      {t(cfg.labelKey as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {t.has(`suggestions.${s.id}.title` as never)
                      ? t(`suggestions.${s.id}.title` as never)
                      : s.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t.has(`suggestions.${s.id}.message` as never)
                      ? t(`suggestions.${s.id}.message` as never, (s.message_params ?? {}) as never)
                      : s.message}
                  </p>

                  {s.cta?.label && s.cta?.href && (
                    <Link
                      href={s.cta.href}
                      className={cn(
                        "inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium",
                        cfg.iconColor,
                        "hover:underline"
                      )}
                    >
                      {s.cta.label}
                      <ArrowRight className="size-3" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { NutritionSuggestionsWidget };
export default NutritionSuggestionsWidget;
