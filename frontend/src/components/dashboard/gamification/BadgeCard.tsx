import { cn } from "@/lib/utils";
import type { ActivityMilestone, AchievementTier } from "@/data/gamification";
import { useTranslations, useLocale } from "next-intl";

const ACTIVITY_EMOJIS: Record<string, string> = {
  running: "🏃",
  cycling: "🚴",
  swimming: "🏊",
  steps: "👟",
};

const TIER_CONFIG: Record<
  AchievementTier,
  { labelKey: string; border: string; bg: string; text: string; pill: string; glow: string }
> = {
  bronze: {
    labelKey: "bronze",
    border: "border-amber-400/50 dark:border-amber-700/60",
    bg: "bg-amber-50/70 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    pill: "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/50 dark:border-amber-600/60 dark:text-amber-300",
    glow: "shadow-amber-200/80 dark:shadow-amber-900/40",
  },
  silver: {
    labelKey: "silver",
    border: "border-slate-400/50 dark:border-slate-500/60",
    bg: "bg-slate-50/70 dark:bg-slate-800/30",
    text: "text-slate-600 dark:text-slate-300",
    pill: "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-700/50 dark:border-slate-500/60 dark:text-slate-200",
    glow: "shadow-slate-200/80 dark:shadow-slate-700/40",
  },
  gold: {
    labelKey: "gold",
    border: "border-yellow-400/50 dark:border-yellow-500/60",
    bg: "bg-yellow-50/70 dark:bg-yellow-950/30",
    text: "text-yellow-700 dark:text-yellow-400",
    pill: "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600/60 dark:text-yellow-300",
    glow: "shadow-yellow-200/80 dark:shadow-yellow-900/40",
  },
  platinum: {
    labelKey: "platinum",
    border: "border-teal-400/50 dark:border-cyan-400/60",
    bg: "bg-teal-50/70 dark:bg-cyan-950/30",
    text: "text-teal-700 dark:text-cyan-300",
    pill: "bg-teal-100 border-teal-300 text-teal-800 dark:bg-cyan-900/50 dark:border-cyan-500/60 dark:text-cyan-200",
    glow: "shadow-teal-200/80 dark:shadow-cyan-900/40",
  },
  diamond: {
    labelKey: "diamond",
    border: "border-violet-400/50 dark:border-violet-400/60",
    bg: "bg-violet-50/70 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    pill: "bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/50 dark:border-violet-500/60 dark:text-violet-200",
    glow: "shadow-violet-200/80 dark:shadow-violet-900/40",
  },
};

// ─── Week progress dots ───────────────────────────────────────

function WeekDots({
  currentWeek,
  daysThisWeek,
  daysCompletedLabel,
}: {
  currentWeek: number;
  daysThisWeek: number;
  daysCompletedLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 4 }, (_, wi) => {
          const weekNum = wi + 1;
          const isComplete = weekNum < currentWeek || (weekNum === currentWeek && daysThisWeek >= 5);
          const isCurrent = weekNum === currentWeek;
          return (
            <div key={wi} className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, di) => {
                const dayNum = di + 1;
                let filled = false;
                if (weekNum < currentWeek) {
                  filled = true;
                } else if (weekNum === currentWeek) {
                  filled = dayNum <= daysThisWeek;
                }
                return (
                  <span
                    key={di}
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      filled
                        ? "bg-[#41BCE6]"
                        : isCurrent
                        ? "bg-muted-foreground/30"
                        : "bg-muted/30"
                    )}
                  />
                );
              })}
              {wi < 3 && (
                <span
                  className={cn(
                    "w-3 h-px",
                    isComplete ? "bg-[#41BCE6]/60" : "bg-muted/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {daysCompletedLabel}
      </p>
    </div>
  );
}

// ─── Main badge card ──────────────────────────────────────────

interface BadgeCardProps {
  milestone: ActivityMilestone;
}

export function BadgeCard({ milestone }: BadgeCardProps) {
  const t = useTranslations("dashboard.achievements");
  const locale = useLocale();

  const tierLabelKey = milestone.tier as AchievementTier;
  const tier = TIER_CONFIG[tierLabelKey];
  const emoji = ACTIVITY_EMOJIS[milestone.activityType] ?? "🏆";
  const isUnlocked = milestone.status === "unlocked";
  const isInProgress = milestone.status === "in-progress";
  const pct = Math.round((milestone.totalDaysCompleted / 20) * 100);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200",
        isUnlocked ? [tier.border, tier.bg, `shadow-lg ${tier.glow}`, "hover:scale-[1.02]"] : "border-border bg-muted/30 dark:bg-muted/10"
      )}
    >
      {/* Badge icon + tier */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "size-12 rounded-xl flex items-center justify-center text-2xl",
            "bg-background/60 border",
            isUnlocked ? tier.border : "border-border",
            !isUnlocked && "grayscale opacity-50"
          )}
        >
          {isUnlocked ? emoji : "🔒"}
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            isUnlocked ? tier.pill : "bg-muted border-border text-muted-foreground"
          )}
        >
          {t(`tierLabels.${tier.labelKey}` as Parameters<typeof t>[0])}
        </span>
      </div>

      {/* Label & target */}
      <div className="space-y-0.5">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            isUnlocked ? "text-foreground" : "text-foreground/60"
          )}
        >
          {(t as (key: string) => string)(`milestoneLabels.${milestone.labelKey}`)}
        </p>
        <p className={cn("text-xs font-medium", isUnlocked ? tier.text : "text-muted-foreground/70")}>
          +{milestone.pointValue} {t("badgeCard.points")}
        </p>
      </div>

      {/* Status */}
      {isUnlocked ? (
        <div className="flex items-center gap-1.5">
          <span className="flex size-2 rounded-full bg-green-500 dark:bg-green-400 ring-2 ring-green-500/30 dark:ring-green-400/30" />
          <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
            {t("badgeCard.achieved")},{" "}
            {milestone.unlockedAt
              ? new Date(milestone.unlockedAt).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : ""}
          </p>
        </div>
      ) : isInProgress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
              {t("badgeCard.weekProgress", { week: milestone.currentWeek, day: milestone.daysThisWeek })}
            </span>
            <span className="text-[10px] text-foreground/60">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-[#41BCE6] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <WeekDots
            currentWeek={milestone.currentWeek}
            daysThisWeek={milestone.daysThisWeek}
            daysCompletedLabel={t("badgeCard.daysCompleted", { n: milestone.totalDaysCompleted })}
          />
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/70">
          {t("badgeCard.notStarted")}
        </p>
      )}
    </div>
  );
}
