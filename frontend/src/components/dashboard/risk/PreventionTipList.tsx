"use client";

import {
  Salad,
  Dumbbell,
  Pill,
  Activity,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreventionTip } from "@/types/api";

const CATEGORY_CONFIG: Record<
  PreventionTip["category"],
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  diet: {
    icon: Salad,
    label: "Chế độ ăn",
    color: "#4ADE80",
    bg: "bg-green-400/10",
  },
  exercise: {
    icon: Dumbbell,
    label: "Vận động",
    color: "#41BCE6",
    bg: "bg-[#41BCE6]/10",
  },
  medication: {
    icon: Pill,
    label: "Thuốc",
    color: "#E7DEA7",
    bg: "bg-[#E7DEA7]/10",
  },
  monitoring: {
    icon: Activity,
    label: "Theo dõi",
    color: "#A78BFA",
    bg: "bg-violet-400/10",
  },
  lifestyle: {
    icon: Lightbulb,
    label: "Lối sống",
    color: "#F97316",
    bg: "bg-orange-500/10",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "Ưu tiên cao", dot: "bg-red-400" },
  medium: { label: "Trung bình", dot: "bg-amber-400" },
  low: { label: "Thấp", dot: "bg-muted-foreground" },
};

interface PreventionTipListProps {
  tips: PreventionTip[];
}

export function PreventionTipList({ tips }: PreventionTipListProps) {
  if (tips.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
        Gợi ý phòng ngừa ({tips.length})
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
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                  cfg.bg
                )}
              >
                <Icon className="w-4 h-4" style={{ color: cfg.color }} aria-hidden />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {tip.title}
                  </p>
                  {/* Priority badge */}
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full", pri.dot)} />
                    {pri.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
                {/* Category chip */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    cfg.bg
                  )}
                  style={{ color: cfg.color }}
                >
                  <Icon className="w-2.5 h-2.5" aria-hidden />
                  {cfg.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
