"use client";

import { useTranslations } from "next-intl";
import {
  Salad,
  Dumbbell,
  Pill,
  Activity,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreventionTip } from "@/types/api";

interface PreventionTipListProps {
  tips: PreventionTip[];
}

const CATEGORY_CONFIG: Record<
  PreventionTip["category"],
  { icon: React.ElementType; labelKey: string; color: string; bg: string }
> = {
  diet: {
    icon: Salad,
    labelKey: "category.diet",
    color: "#4ADE80",
    bg: "bg-green-400/10",
  },
  exercise: {
    icon: Dumbbell,
    labelKey: "category.exercise",
    color: "#41BCE6",
    bg: "bg-[#41BCE6]/10",
  },
  medication: {
    icon: Pill,
    labelKey: "category.medication",
    color: "#E7DEA7",
    bg: "bg-[#E7DEA7]/10",
  },
  monitoring: {
    icon: Activity,
    labelKey: "category.monitoring",
    color: "#A78BFA",
    bg: "bg-violet-400/10",
  },
  lifestyle: {
    icon: Lightbulb,
    labelKey: "category.lifestyle",
    color: "#F97316",
    bg: "bg-orange-500/10",
  },
};

const PRIORITY_CONFIG = {
  high: { labelKey: "priority.high", dot: "bg-red-400" },
  medium: { labelKey: "priority.medium", dot: "bg-amber-400" },
  low: { labelKey: "priority.low", dot: "bg-muted-foreground" },
};

export function PreventionTipList({ tips }: PreventionTipListProps) {
  const t = useTranslations("dashboard.risk");

  if (tips.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Lightbulb className="size-3.5 text-muted-foreground" />
        {t("tips", { n: tips.length })}
      </p>
      <ul className="space-y-2.5">
        {tips.map((tip) => {
          const cfg = CATEGORY_CONFIG[tip.category];
          const pri = PRIORITY_CONFIG[tip.priority];
          const Icon = cfg.icon;

          return (
            <li
              key={tip.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5"
            >
              {/* Category icon */}
              <div
                className={cn(
                  "flex-shrink-0 size-8 rounded-lg flex items-center justify-center mt-0.5",
                  cfg.bg
                )}
              >
                <Icon className="size-4" style={{ color: cfg.color }} aria-hidden />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {t.has(`tipTitles.${tip.id}` as never)
                      ? t(`tipTitles.${tip.id}` as never)
                      : tip.title}
                  </p>
                  {/* Priority badge */}
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                    <span className={cn("size-1.5 rounded-full", pri.dot)} />
                    {t(pri.labelKey)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t.has(`tipDescriptions.${tip.id}` as never)
                    ? t(`tipDescriptions.${tip.id}` as never)
                    : tip.description}
                </p>
                {/* Category chip */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    cfg.bg
                  )}
                  style={{ color: cfg.color }}
                >
                  <Icon className="size-2.5" aria-hidden />
                  {t(cfg.labelKey)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
