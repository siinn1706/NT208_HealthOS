import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import {
  Dumbbell,
  Clock,
  Flame,
  Footprints,
  Heart,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseSuggestion } from "@/lib/dashboard-data";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Moon,
  CheckCircle: CheckCircle2,
  AlertCircle: AlertTriangle,
  Lightbulb,
  Target,
  Info,
};

const TYPE_STYLES = {
  warning: {
    bg: "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40",
    iconColor: "text-red-500",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-600 dark:text-red-400",
  },
  tip: {
    bg: "bg-[#41BCE6]/8 dark:bg-[#41BCE6]/10 border-[#41BCE6]/25 dark:border-[#41BCE6]/30",
    iconColor: "text-[#41BCE6]",
    badgeBg: "bg-[#41BCE6]/15",
    badgeText: "text-[#1a8ab3] dark:text-[#41BCE6]",
  },
  goal: {
    bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
    iconColor: "text-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  success: {
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40",
    iconColor: "text-emerald-500",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
};

const INTENSITY_BADGE = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface Props {
  suggestions: ExerciseSuggestion[];
}

// Server Component
export async function ExerciseSuggestionsWidget({ suggestions }: Props) {
  const t = await getTranslations("dashboard.exercise");
  const locale = await getLocale();

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4 h-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* List */}
      <div className="px-5 py-4 space-y-2.5">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-center text-muted-foreground">
              {t("noData")}
            </p>
          </div>
        ) : (
          suggestions.slice(0, 3).map((s) => {
            const style = TYPE_STYLES[s.type] ?? TYPE_STYLES.tip;
            const IconComponent = ICON_MAP[s.icon] ?? Info;

            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-lg border p-3 flex gap-3 items-start",
                  style.bg,
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
                    style.badgeBg,
                  )}
                >
                  <IconComponent className={cn("w-3.5 h-3.5", style.iconColor)} />
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        style.badgeBg,
                        style.badgeText,
                      )}
                    >
                      {t(`types.${s.type}` as Parameters<typeof t>[0])}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        INTENSITY_BADGE[s.intensity],
                      )}
                    >
                      {t(`intensity.${s.intensity}` as Parameters<typeof t>[0])}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {t.has(`suggestions.${s.id}.title` as never)
                      ? t(`suggestions.${s.id}.title` as never)
                      : s.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t.has(`suggestions.${s.id}.message` as never)
                      ? t(
                          `suggestions.${s.id}.message` as never,
                          (s.message_params ?? {}) as never,
                        )
                      : s.message}
                  </p>

                  {/* Duration + Category */}
                  <div className="flex items-center gap-3 mt-0.5">
                    {s.duration_minutes && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {s.duration_minutes} {t("minutes")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {t(`categories.${s.category}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <Link
          href={`/${locale}/dashboard/progress`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
        >
          {t("viewAll")}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}