"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Dumbbell, Clock, Flame, Footprints, Heart, Moon,
  CheckCircle2, AlertTriangle, Lightbulb, Target, Info,
  ArrowRight, Calendar, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseSuggestion } from "@/lib/dashboard-data";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell, Flame, Footprints, Heart, Moon,
  CheckCircle: CheckCircle2,
  AlertCircle: AlertTriangle,
  Lightbulb, Target, Info,
};

// ── Style configs ─────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  warning: {
    border: "border-red-200/70 dark:border-red-900/50",
    bg:     "bg-red-50/60 dark:bg-red-950/20",
    accent: "bg-red-500",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    icon:   "text-red-500",
    badge:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  tip: {
    border: "border-sky-200/70 dark:border-sky-900/50",
    bg:     "bg-sky-50/60 dark:bg-sky-950/20",
    accent: "bg-sky-400",
    iconBg: "bg-sky-100/80 dark:bg-sky-900/30",
    icon:   "text-sky-500",
    badge:  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  },
  goal: {
    border: "border-amber-200/70 dark:border-amber-900/50",
    bg:     "bg-amber-50/60 dark:bg-amber-950/20",
    accent: "bg-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    icon:   "text-amber-500",
    badge:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  success: {
    border: "border-emerald-200/70 dark:border-emerald-900/50",
    bg:     "bg-emerald-50/60 dark:bg-emerald-950/20",
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    icon:   "text-emerald-500",
    badge:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
} as const;

// ── Intensity ─────────────────────────────────────────────────────────────────

const INTENSITY = {
  low:    { bars: 1, color: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
  medium: { bars: 2, color: "bg-amber-400",   text: "text-amber-600 dark:text-amber-400"   },
  high:   { bars: 3, color: "bg-red-400",     text: "text-red-600 dark:text-red-400"       },
} as const;

// ── Derived data ──────────────────────────────────────────────────────────────

const KCAL_PER_MIN: Record<string, number> = { low: 4, medium: 7, high: 10 };

const MUSCLES: Record<string, string[]> = {
  cardio:      ["Toàn thân", "Tim mạch"],
  strength:    ["Ngực", "Lưng", "Tay"],
  flexibility: ["Lưng", "Hông", "Vai"],
  balance:     ["Lõi", "Cân bằng"],
};

// day 0=Mon … 5=Sat that each category is assigned to
const CAT_DAYS: Record<string, number[]> = {
  cardio: [0, 3], strength: [1, 4], flexibility: [2], balance: [5],
};

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

function estCal(s: ExerciseSuggestion) {
  return s.duration_minutes ? s.duration_minutes * (KCAL_PER_MIN[s.intensity] ?? 5) : 0;
}

// ── IntensityBars ─────────────────────────────────────────────────────────────

function IntensityBars({ intensity }: { intensity: ExerciseSuggestion["intensity"] }) {
  const cfg = INTENSITY[intensity] ?? INTENSITY.low;
  return (
    <div className="flex items-end gap-px" aria-hidden>
      {[1, 2, 3].map((n) => (
        <div key={n} className={cn("w-1.5 rounded-sm", n <= cfg.bars ? cfg.color : "bg-muted",
          n === 1 ? "h-1.5" : n === 2 ? "h-2.5" : "h-3.5")} />
      ))}
    </div>
  );
}

// ── Props / tabs ──────────────────────────────────────────────────────────────

type Tab = "rec" | "week";

interface Props { suggestions: ExerciseSuggestion[] }

// ── Widget ────────────────────────────────────────────────────────────────────

export function ExerciseSuggestionsWidget({ suggestions }: Props) {
  const t      = useTranslations("dashboard.exercise");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("rec");

  const totalKcalWeekly = suggestions.reduce(
    (sum, s) => sum + estCal(s) * (CAT_DAYS[s.category]?.length ?? 1), 0,
  );

  const weeklyPlan = DAYS.map((label, idx) => {
    if (idx === 6) return { label, items: [] as ExerciseSuggestion[], rest: true };
    const items = suggestions.filter((s) => (CAT_DAYS[s.category] ?? []).includes(idx));
    return { label, items, rest: items.length === 0 };
  });

  const todayIdx    = (new Date().getDay() + 6) % 7; // 0=Mon
  const activeCount = weeklyPlan.filter((d) => !d.rest).length;

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{t("title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        {totalKcalWeekly > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-orange-500 tabular-nums">~{totalKcalWeekly}</p>
            <p className="text-[9px] text-muted-foreground leading-none">kcal/tuần</p>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 pt-2.5 pb-1">
        {([["rec", t("tabRecommendations"), <BarChart3 key="b" className="w-3.5 h-3.5" />],
           ["week", t("tabWeekly"), <Calendar key="c" className="w-3.5 h-3.5" />]] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              tab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 py-2 space-y-2.5 overflow-y-auto min-h-0">

        {/* Recommendations tab */}
        {tab === "rec" && (
          suggestions.length === 0
            ? <div className="flex flex-col items-center py-6 gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              </div>
            : suggestions.slice(0, 3).map((s) => {
                const sty = TYPE_STYLES[s.type] ?? TYPE_STYLES.tip;
                const Icon = ICON_MAP[s.icon] ?? Info;
                const cal = estCal(s);
                const ms  = MUSCLES[s.category] ?? [];
                const cfg = INTENSITY[s.intensity] ?? INTENSITY.low;

                return (
                  <div key={s.id} className={cn(
                    "relative rounded-lg border p-3 flex gap-2.5 overflow-hidden",
                    sty.bg, sty.border,
                  )}>
                    {/* Left accent */}
                    <div className={cn("absolute left-0 inset-y-0 w-[3px]", sty.accent)} aria-hidden />

                    {/* Icon */}
                    <div className={cn("flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center", sty.iconBg)}>
                      <Icon className={cn("w-3.5 h-3.5", sty.icon)} aria-hidden />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 space-y-1 pl-0.5">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide", sty.badge)}>
                          {t(`types.${s.type}` as Parameters<typeof t>[0])}
                        </span>
                        <IntensityBars intensity={s.intensity} />
                        <span className={cn("text-[10px] font-medium", cfg.text)}>
                          {t(`intensity.${s.intensity}` as Parameters<typeof t>[0])}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {t.has(`suggestions.${s.id}.title` as never)
                          ? t(`suggestions.${s.id}.title` as never)
                          : s.title}
                      </p>

                      {/* Message */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t.has(`suggestions.${s.id}.message` as never)
                          ? t(`suggestions.${s.id}.message` as never, (s.message_params ?? {}) as never)
                          : s.message}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                        {s.duration_minutes != null && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" aria-hidden />{s.duration_minutes} {t("minutes")}
                          </span>
                        )}
                        {cal > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-orange-500 font-medium">
                            <Flame className="w-3 h-3" aria-hidden />~{cal} kcal
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {t(`categories.${s.category}` as Parameters<typeof t>[0])}
                        </span>
                      </div>

                      {/* Muscle chips */}
                      {ms.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {ms.map((m) => (
                            <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/70 dark:bg-muted border border-border text-muted-foreground">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
        )}

        {/* Weekly plan tab */}
        {tab === "week" && (
          <div className="space-y-3 py-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {t("weeklyPlanTitle")}
            </p>

            {/* 7-day grid */}
            <div className="grid grid-cols-7 gap-1">
              {weeklyPlan.map(({ label, items, rest }, i) => {
                const isToday = i === todayIdx;
                const s0  = items[0];
                const sty = s0 ? (TYPE_STYLES[s0.type] ?? TYPE_STYLES.tip) : null;
                const Ic  = s0 ? (ICON_MAP[s0.icon] ?? Info) : null;

                return (
                  <div key={label} className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded-lg min-h-[56px]",
                    isToday ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30 dark:bg-muted/10",
                  )}>
                    <span className={cn("text-[10px] font-bold", isToday ? "text-primary" : "text-muted-foreground")}>
                      {label}
                    </span>
                    {rest
                      ? <span className="text-[8px] text-muted-foreground/50 mt-auto leading-tight text-center">Nghỉ</span>
                      : Ic && sty
                        ? <>
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", sty.iconBg)}>
                              <Ic className={cn("w-2.5 h-2.5", sty.icon)} aria-hidden />
                            </div>
                            <span className="text-[8px] text-muted-foreground leading-tight text-center truncate w-full px-0.5">
                              {t(`categories.${s0!.category}` as Parameters<typeof t>[0])}
                            </span>
                          </>
                        : null
                    }
                  </div>
                );
              })}
            </div>

            {/* Weekly stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/30 dark:bg-muted/10 border border-border p-2.5">
                <p className="text-base font-bold tabular-nums text-foreground leading-none">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-none">ngày luyện tập</p>
              </div>
              <div className="rounded-lg bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 p-2.5">
                <p className="text-base font-bold tabular-nums text-orange-500 leading-none">~{totalKcalWeekly}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-none">kcal ước tính</p>
              </div>
            </div>

            {/* Per-suggestion weekly breakdown */}
            {suggestions.length > 0 && (
              <div className="rounded-lg bg-muted/20 dark:bg-muted/10 border border-border p-2.5 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Chi tiết</p>
                {suggestions.slice(0, 4).map((s) => {
                  const Icon = ICON_MAP[s.icon] ?? Info;
                  const sty  = TYPE_STYLES[s.type] ?? TYPE_STYLES.tip;
                  const cal  = estCal(s) * (CAT_DAYS[s.category]?.length ?? 1);
                  const days = (CAT_DAYS[s.category] ?? []).map((d) => DAYS[d]).join(", ");
                  return (
                    <div key={s.id} className="flex items-start gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", sty.iconBg)}>
                        <Icon className={cn("w-2.5 h-2.5", sty.icon)} aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate leading-tight">
                          {t.has(`suggestions.${s.id}.title` as never)
                            ? t(`suggestions.${s.id}.title` as never)
                            : s.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{days}</p>
                      </div>
                      {cal > 0 && (
                        <span className="text-[10px] text-orange-500 font-semibold tabular-nums flex-shrink-0">~{cal}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-border">
        <Link href={`/${locale}/dashboard/progress`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors">
          {t("viewAll")}<ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
