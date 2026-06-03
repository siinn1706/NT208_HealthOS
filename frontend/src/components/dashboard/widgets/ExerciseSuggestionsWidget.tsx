"use client";

import { useEffect, useState } from "react";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
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

// ── Category config: gradient + muscle i18n keys ──────────────────────────────
const CAT_CONFIG: Record<string, {
  gradient: string;
  light: string;
  muscleKeys: string[];
  days: number[];
}> = {
  cardio:      { gradient: "from-orange-500 to-red-500",    light: "bg-orange-50 dark:bg-orange-950/30",  muscleKeys: ["fullBody", "cardiovascular", "lungs"],  days: [1, 4] },
  strength:    { gradient: "from-blue-600 to-indigo-600",   light: "bg-blue-50 dark:bg-blue-950/30",     muscleKeys: ["chest", "back", "arms", "legs"],       days: [0, 3] },
  flexibility: { gradient: "from-purple-500 to-violet-500", light: "bg-purple-50 dark:bg-purple-950/30", muscleKeys: ["spine", "hips", "shoulders", "tendons"], days: [2] },
  balance:     { gradient: "from-teal-500 to-cyan-500",     light: "bg-teal-50 dark:bg-teal-950/30",     muscleKeys: ["core", "balance", "nervous"],           days: [5, 6] },
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
  low:    { key: "low",    bars: 1, color: "bg-emerald-500" },
  medium: { key: "medium", bars: 2, color: "bg-amber-500"   },
  high:   { key: "high",   bars: 3, color: "bg-red-500"      },
} as const;

const KCAL_PER_MIN: Record<string, number> = { low: 4, medium: 7, high: 10 };

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const EXERCISE_SUGGESTIONS_PATH = "/api/v1/dashboard/exercise-suggestions";
const SUGGESTION_TYPES = ["tip", "warning", "goal", "success"] as const;
const INTENSITIES = ["low", "medium", "high"] as const;
const CATEGORIES = ["cardio", "strength", "flexibility", "balance"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function estCal(s: ExerciseSuggestion) {
  return s.duration_minutes ? s.duration_minutes * (KCAL_PER_MIN[s.intensity] ?? 5) : 0;
}

function isSuggestionType(value: unknown): value is ExerciseSuggestion["type"] {
  return typeof value === "string" && SUGGESTION_TYPES.includes(value as ExerciseSuggestion["type"]);
}

function isIntensity(value: unknown): value is ExerciseSuggestion["intensity"] {
  return typeof value === "string" && INTENSITIES.includes(value as ExerciseSuggestion["intensity"]);
}

function isCategory(value: unknown): value is ExerciseSuggestion["category"] {
  return typeof value === "string" && CATEGORIES.includes(value as ExerciseSuggestion["category"]);
}

function normalizeMessageParams(value: unknown): Record<string, number | string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const params: Record<string, number | string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "number" || typeof item === "string") {
      params[key] = item;
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

function normalizeExerciseSuggestion(item: unknown, index: number): ExerciseSuggestion | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const row = item as Record<string, unknown>;
  const source = row.source === "ai" || row.source === "rule" ? row.source : undefined;
  const messageParams = normalizeMessageParams(row.message_params);
  const duration =
    typeof row.duration_minutes === "number" && Number.isFinite(row.duration_minutes)
      ? row.duration_minutes
      : null;

  return {
    id:
      typeof row.id === "string" && row.id.trim()
        ? row.id
        : `exercise-suggestion-${index}`,
    type: isSuggestionType(row.type) ? row.type : "tip",
    icon: typeof row.icon === "string" && row.icon in ICON_MAP ? row.icon : "Info",
    title: typeof row.title === "string" ? row.title : "",
    message: typeof row.message === "string" ? row.message : "",
    ...(messageParams ? { message_params: messageParams } : {}),
    priority:
      typeof row.priority === "number" && Number.isFinite(row.priority)
        ? row.priority
        : 99,
    duration_minutes: duration,
    intensity: isIntensity(row.intensity) ? row.intensity : "low",
    category: isCategory(row.category) ? row.category : "cardio",
    ...(source ? { source } : {}),
  };
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
            "flex-shrink-0 size-9 rounded-xl flex items-center justify-center shadow-sm",
            `bg-gradient-to-br ${cat.gradient}`,
          )}>
            <Icon className="size-[18px] text-white" aria-hidden />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[13px] font-semibold text-foreground leading-tight flex items-center gap-1">
                {isAi && (
                  <Sparkles className="size-3 text-violet-500 flex-shrink-0" aria-label="AI-generated" />
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
              <Clock className="size-3" aria-hidden />
              {s.duration_minutes} {t("minutes")}
            </span>
          )}
          {cal > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-full">
              <Flame className="size-3" aria-hidden />
              ~{cal} kcal
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 dark:bg-muted/30 px-2 py-1 rounded-full">
            <IntensityBars intensity={s.intensity} />
            {t(`intensity.${icfg.key}` as Parameters<typeof t>[0])}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full",
            cat.light,
          )}>
            {t(`categories.${s.category}` as Parameters<typeof t>[0])}
          </span>
        </div>

        {/* Row 3: Muscle chips */}
        {cat.muscleKeys.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cat.muscleKeys.map((key) => (
              <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background dark:bg-muted border border-border/60 text-muted-foreground">
                {t(`muscles.${key}` as Parameters<typeof t>[0])}
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
        <span className="text-[8px] text-muted-foreground/40 text-center leading-tight mt-auto">{t("restDay")}</span>
      ) : Icon && cat ? (
        <>
          <div className={cn("size-6 rounded-full flex items-center justify-center", `bg-gradient-to-br ${cat.gradient}`)}>
            <Icon className="size-3 text-white" aria-hidden />
          </div>
          <span className="text-[8px] text-muted-foreground leading-tight text-center truncate w-full px-0.5">
            {t(`categories.${s0!.category}` as Parameters<typeof t>[0])}
          </span>
        </>
      ) : null}
    </div>
  );
}

function ExerciseSuggestionsSkeleton({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-2.5" aria-live="polite">
      <p className="sr-only">{t("loading")}</p>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-border/70 px-3.5 pt-4 pb-3.5 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="size-3/5 rounded-full bg-muted animate-pulse" />
              <div className="h-2.5 w-full rounded-full bg-muted/80 animate-pulse" />
              <div className="h-2.5 w-4/5 rounded-full bg-muted/70 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-14 rounded-full bg-muted/80 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-muted/70 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-muted/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExerciseSuggestionsEmpty({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col items-center py-8 gap-2 text-center">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
        <Dumbbell className="size-5 text-muted-foreground/50" aria-hidden />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{t("noData")}</p>
    </div>
  );
}

function ExerciseSuggestionsError({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col items-center py-8 gap-2 text-center">
      <div className="size-10 rounded-full bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400 flex items-center justify-center">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{t("loadError")}</p>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
type Tab = "rec" | "week";
type FetchState =
  | { status: "loading"; suggestions: ExerciseSuggestion[] }
  | { status: "success"; suggestions: ExerciseSuggestion[] }
  | { status: "error"; suggestions: ExerciseSuggestion[] };

export function ExerciseSuggestionsWidget() {
  const t      = useTranslations("dashboard.exercise");
  const [tab, setTab] = useState<Tab>("rec");
  const [fetchState, setFetchState] = useState<FetchState>({
    status: "loading",
    suggestions: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    async function loadSuggestions() {
      try {
        const res = await fetch(EXERCISE_SUGGESTIONS_PATH, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Could not load exercise suggestions.");

        const json = await res.json().catch(() => null);
        const data = (json as { data?: unknown } | null)?.data;
        if (!Array.isArray(data)) throw new Error("Malformed exercise suggestions payload.");

        const suggestions = data
          .map((item, index) => normalizeExerciseSuggestion(item, index))
          .filter((item): item is ExerciseSuggestion => item !== null);

        if (isActive) {
          setFetchState({ status: "success", suggestions });
        }
      } catch {
        if (isActive && !controller.signal.aborted) {
          setFetchState({ status: "error", suggestions: [] });
        }
      }
    }

    void loadSuggestions();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  const suggestions = fetchState.status === "success" ? fetchState.suggestions : [];

  const todayIdx = (new Date().getDay() + 6) % 7;  // 0=Mon
  const dayLabels = DAY_KEYS.map((key) => t(`days.${key}` as Parameters<typeof t>[0]));

  const weeklyPlan = dayLabels.map((label, idx) => {
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
          <div className="size-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/20">
            <Dumbbell className="size-4 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{t("title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Weekly kcal chip */}
        {totalKcalWeekly > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40 px-2.5 py-1.5 rounded-full">
            <TrendingUp className="size-3 text-orange-500" aria-hidden />
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 tabular-nums">
              ~{totalKcalWeekly.toLocaleString()} kcal
            </span>
            <span className="text-[9px] text-muted-foreground">{t("perWeek")}</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 pt-2.5 pb-1.5 overflow-x-auto scrollbar-none">
        {([
          ["rec",  t("tabRecommendations"), <BarChart3 key="b" className="size-3.5" />],
          ["week", t("tabWeekly"),          <Calendar  key="c" className="size-3.5" />],
        ] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button type="button"
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap flex-shrink-0",
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
          fetchState.status === "loading" ? (
            <ExerciseSuggestionsSkeleton t={t} />
          ) : fetchState.status === "error" ? (
            <ExerciseSuggestionsError t={t} />
          ) : suggestions.length === 0 ? (
            <ExerciseSuggestionsEmpty t={t} />
          ) : (
            suggestions.slice(0, 3).map((s) => (
              <SuggestionCard key={s.id} s={s} t={t} />
            ))
          )
        )}

        {/* Weekly plan tab */}
        {tab === "week" && (
          fetchState.status === "loading" ? (
            <ExerciseSuggestionsSkeleton t={t} />
          ) : fetchState.status === "error" ? (
            <ExerciseSuggestionsError t={t} />
          ) : suggestions.length === 0 ? (
            <ExerciseSuggestionsEmpty t={t} />
          ) : (
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
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">{t("trainingDays")}</p>
                </div>
                <div className="rounded-xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 p-3">
                  <p className="text-lg font-bold tabular-nums text-orange-500 leading-none">~{totalKcalWeekly.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">{t("estimatedKcal")}</p>
                </div>
              </div>

              {/* Per-suggestion breakdown */}
              {suggestions.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("planDetails")}</p>
                  {suggestions.slice(0, 4).map((s) => {
                    const cat  = CAT_CONFIG[s.category] ?? CAT_CONFIG.cardio;
                    const Icon = ICON_MAP[s.icon] ?? Info;
                    const cal  = estCal(s) * (cat.days.length ?? 1);
                    const days = cat.days.map((d) => dayLabels[d]).join(", ");
                    const title = t.has(`suggestions.${s.id}.title` as never)
                      ? t(`suggestions.${s.id}.title` as never)
                      : s.title;
                    return (
                      <div key={s.id} className="flex items-center gap-2.5">
                        <div className={cn("size-6 rounded-lg flex items-center justify-center flex-shrink-0", `bg-gradient-to-br ${cat.gradient}`)}>
                          <Icon className="size-3 text-white" aria-hidden />
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
          )
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-border">
        <Link
          href={`/dashboard/progress`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          {t("viewAll")} <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
