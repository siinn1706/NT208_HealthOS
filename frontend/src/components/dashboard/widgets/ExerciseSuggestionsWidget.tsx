"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Dumbbell, Clock, Flame, Footprints, Heart, Moon,
  CheckCircle2, AlertTriangle, Lightbulb, Target, Info,
  ArrowRight, Calendar, BarChart3, Zap, TrendingUp, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseSuggestion } from "@/lib/dashboard-data";

// ── Icon map ───────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell, Flame, Footprints, Heart, Moon, Zap,
  CheckCircle: CheckCircle2,
  AlertCircle: AlertTriangle,
  Lightbulb, Target, Info,
};

// ── Category config: gradient + muscles ───────────────────────────────────────
const CAT_CONFIG: Record<string, {
  gradient: string;
  light: string;
  muscles: string[];
  days: number[];
}> = {
  cardio:      { gradient: "from-orange-500 to-red-500",    light: "bg-orange-50 dark:bg-orange-950/30",  muscles: ["Toàn thân", "Tim mạch", "Phổi"],  days: [1, 4] },
  strength:    { gradient: "from-blue-600 to-indigo-600",   light: "bg-blue-50 dark:bg-blue-950/30",     muscles: ["Ngực", "Lưng", "Tay", "Chân"],   days: [0, 3] },
  flexibility: { gradient: "from-purple-500 to-violet-500", light: "bg-purple-50 dark:bg-purple-950/30", muscles: ["Cột sống", "Hông", "Vai", "Gân"],  days: [2] },
  balance:     { gradient: "from-teal-500 to-cyan-500",     light: "bg-teal-50 dark:bg-teal-950/30",     muscles: ["Lõi", "Cân bằng", "Thần kinh"],  days: [5, 6] },
};

// ── Type config: badge color ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { badge: string; border: string; dot: string }> = {
  warning: { badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",     border: "border-red-200/80 dark:border-red-900/50",     dot: "bg-red-500" },
  tip:     { badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",     border: "border-sky-200/80 dark:border-sky-900/50",     dot: "bg-sky-500" },
  goal:    { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", border: "border-amber-200/80 dark:border-amber-900/50", dot: "bg-amber-500" },
  success: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", border: "border-emerald-200/80 dark:border-emerald-900/50", dot: "bg-emerald-500" },
};

// ── Intensity ──────────────────────────────────────────────────────────────────
const INTENSITY_CONFIG = {
  low:    { label: "Nhẹ",  bars: 1, color: "bg-emerald-500" },
  medium: { label: "Vừa",  bars: 2, color: "bg-amber-500"   },
  high:   { label: "Cao",  bars: 3, color: "bg-red-500"      },
} as const;

const KCAL_PER_MIN: Record<string, number> = { low: 4, medium: 7, high: 10 };

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function estCal(s: ExerciseSuggestion) {
  return s.duration_minutes ? s.duration_minutes * (KCAL_PER_MIN[s.intensity] ?? 5) : 0;
}

// ── IntensityBars ──────────────────────────────────────────────────────────────
function IntensityBars({ intensity }: { intensity: ExerciseSuggestion["intensity"] }) {
  const cfg = INTENSITY_CONFIG[intensity] ?? INTENSITY_CONFIG.low;
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span key={n} className={cn(
          "w-[3px] rounded-sm transition-colors",
          n <= cfg.bars ? cfg.color : "bg-muted-foreground/20",
          n === 1 ? "h-[6px]" : n === 2 ? "h-[10px]" : "h-[14px]",
        )} />
      ))}
    </span>
  );
}

// ── Suggestion card ────────────────────────────────────────────────────────────
function SuggestionCard({ s, t }: { s: ExerciseSuggestion; t: ReturnType<typeof useTranslations> }) {
  const cat  = CAT_CONFIG[s.category]  ?? CAT_CONFIG.cardio;
  const type = TYPE_CONFIG[s.type]     ?? TYPE_CONFIG.tip;
  const Icon = ICON_MAP[s.icon]        ?? Info;
  const cal  = estCal(s);
  const icfg = INTENSITY_CONFIG[s.intensity] ?? INTENSITY_CONFIG.low;

  // AI-generated suggestions ship plain Vietnamese text in title/message,
  // rule-based ones ship i18n keys that need translation lookup.
  const isAi = s.source === "ai";
  const title = isAi
    ? s.title
    : (t.has(`suggestions.${s.id}.title` as never)
        ? t(`suggestions.${s.id}.title` as never)
        : s.title);
  const message = isAi
    ? s.message
    : (t.has(`suggestions.${s.id}.message` as never)
        ? t(`suggestions.${s.id}.message` as never, (s.message_params ?? {}) as never)
        : s.message);

  return (
    <div className={cn(
      "group relative rounded-xl border overflow-hidden transition-shadow hover:shadow-sm",
      type.border,
    )}>
      {/* Top accent line */}
      <div className={cn("absolute top-0 inset-x-0 h-[2px]", type.dot, "opacity-60")} />

      <div className="px-3.5 pt-4 pb-3.5 space-y-3">
        {/* Row 1: Icon + title + type badge */}
        <div className="flex items-start gap-3">
          {/* Gradient icon */}
          <div className={cn(
            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
            `bg-gradient-to-br ${cat.gradient}`,
          )}>
            <Icon className="w-[18px] h-[18px] text-white" aria-hidden />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[13px] font-semibold text-foreground leading-tight flex items-center gap-1">
                {isAi && (
                  <Sparkles className="w-3 h-3 text-violet-500 flex-shrink-0" aria-label="AI-generated" />
                )}
                {title}
              </p>
              <span className={cn(
                "flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                type.badge,
              )}>
                {t(`types.${s.type}` as Parameters<typeof t>[0])}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Row 2: Stats pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {s.duration_minutes != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 dark:bg-muted/30 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" aria-hidden />
              {s.duration_minutes} {t("minutes")}
            </span>
          )}
          {cal > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-full">
              <Flame className="w-3 h-3" aria-hidden />
              ~{cal} kcal
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 dark:bg-muted/30 px-2 py-1 rounded-full">
            <IntensityBars intensity={s.intensity} />
            {icfg.label}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full",
            cat.light,
          )}>
            {t(`categories.${s.category}` as Parameters<typeof t>[0])}
          </span>
        </div>

        {/* Row 3: Muscle chips */}
        {cat.muscles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cat.muscles.map((m) => (
              <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background dark:bg-muted border border-border/60 text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Weekly day cell ────────────────────────────────────────────────────────────
function DayCell({
  label, items, rest, isToday, t,
}: {
  label: string;
  items: ExerciseSuggestion[];
  rest: boolean;
  isToday: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const s0  = items[0];
  const cat = s0 ? (CAT_CONFIG[s0.category] ?? CAT_CONFIG.cardio) : null;
  const Icon = s0 ? (ICON_MAP[s0.icon] ?? Info) : null;

  return (
    <div className={cn(
      "flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl min-h-[64px] transition-colors",
      isToday ? "bg-primary/10 ring-1 ring-primary/30 ring-offset-0" : "bg-muted/30 dark:bg-muted/10",
    )}>
      <span className={cn("text-[10px] font-bold", isToday ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
      {rest ? (
        <span className="text-[8px] text-muted-foreground/40 text-center leading-tight mt-auto">Nghỉ</span>
      ) : Icon && cat ? (
        <>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", `bg-gradient-to-br ${cat.gradient}`)}>
            <Icon className="w-3 h-3 text-white" aria-hidden />
          </div>
          <span className="text-[8px] text-muted-foreground leading-tight text-center truncate w-full px-0.5">
            {t(`categories.${s0!.category}` as Parameters<typeof t>[0])}
          </span>
        </>
      ) : null}
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
type Tab = "rec" | "week";

interface Props { suggestions: ExerciseSuggestion[] }

export function ExerciseSuggestionsWidget({ suggestions }: Props) {
  const t      = useTranslations("dashboard.exercise");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("rec");

  const todayIdx = (new Date().getDay() + 6) % 7;  // 0=Mon

  const weeklyPlan = DAYS.map((label, idx) => {
    if (idx === 6) return { label, items: [] as ExerciseSuggestion[], rest: true };
    const dayNums = Object.entries(CAT_CONFIG).flatMap(([cat, cfg]) =>
      cfg.days.includes(idx) ? suggestions.filter((s) => s.category === cat) : []
    );
    return { label, items: dayNums, rest: dayNums.length === 0 };
  });

  const totalKcalWeekly = suggestions.reduce(
    (sum, s) => sum + estCal(s) * ((CAT_CONFIG[s.category]?.days.length) ?? 1), 0,
  );
  const activeCount = weeklyPlan.filter((d) => !d.rest).length;

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/20">
            <Dumbbell className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{t("title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Weekly kcal chip */}
        {totalKcalWeekly > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40 px-2.5 py-1.5 rounded-full">
            <TrendingUp className="w-3 h-3 text-orange-500" aria-hidden />
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 tabular-nums">
              ~{totalKcalWeekly.toLocaleString()} kcal
            </span>
            <span className="text-[9px] text-muted-foreground">/tuần</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 pt-2.5 pb-1.5">
        {([
          ["rec",  t("tabRecommendations"), <BarChart3 key="b" className="w-3.5 h-3.5" />],
          ["week", t("tabWeekly"),          <Calendar  key="c" className="w-3.5 h-3.5" />],
        ] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap",
              tab === key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-3.5 py-2 space-y-2.5 overflow-y-auto min-h-0">

        {/* Recommendations tab */}
        {tab === "rec" && (
          suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-muted-foreground/50" aria-hidden />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("noData")}</p>
            </div>
          ) : (
            suggestions.slice(0, 3).map((s) => (
              <SuggestionCard key={s.id} s={s} t={t} />
            ))
          )
        )}

        {/* Weekly plan tab */}
        {tab === "week" && (
          <div className="space-y-3 py-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t("weeklyPlanTitle")}
            </p>

            {/* 7-day grid */}
            <div className="grid grid-cols-7 gap-1">
              {weeklyPlan.map(({ label, items, rest }, i) => (
                <DayCell key={label} label={label} items={items} rest={rest} isToday={i === todayIdx} t={t} />
              ))}
            </div>

            {/* Weekly stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/30 dark:bg-muted/10 border border-border p-3">
                <p className="text-lg font-bold tabular-nums text-foreground leading-none">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-none">ngày luyện tập</p>
              </div>
              <div className="rounded-xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 p-3">
                <p className="text-lg font-bold tabular-nums text-orange-500 leading-none">~{totalKcalWeekly.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-none">kcal ước tính</p>
              </div>
            </div>

            {/* Per-suggestion breakdown */}
            {suggestions.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chi tiết kế hoạch</p>
                {suggestions.slice(0, 4).map((s) => {
                  const cat  = CAT_CONFIG[s.category] ?? CAT_CONFIG.cardio;
                  const Icon = ICON_MAP[s.icon] ?? Info;
                  const cal  = estCal(s) * (cat.days.length ?? 1);
                  const days = cat.days.map((d) => DAYS[d]).join(", ");
                  const title = t.has(`suggestions.${s.id}.title` as never)
                    ? t(`suggestions.${s.id}.title` as never)
                    : s.title;
                  return (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", `bg-gradient-to-br ${cat.gradient}`)}>
                        <Icon className="w-3 h-3 text-white" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">{title}</p>
                        <p className="text-[10px] text-muted-foreground">{days}</p>
                      </div>
                      {cal > 0 && (
                        <span className="text-[10px] font-bold text-orange-500 tabular-nums flex-shrink-0">~{cal} kcal</span>
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
        <Link
          href={`/${locale}/dashboard/progress`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          {t("viewAll")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
