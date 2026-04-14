import { getTranslations, getLocale } from "next-intl/server";
import { Suspense } from "react";
import { Target, Flame, Award, TrendingUp } from "lucide-react";
import { StreakHeatmap } from "@/components/charts/StreakHeatmap";
import { getGamificationSummary } from "@/lib/gamification-data";
import { formatDate, formatNumber, getUnitLabel } from "@/lib/format-utils";

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-muted h-32" />;
}

async function GamificationGoalsContent() {
  const t = await getTranslations("dashboard.achievements");
  const tg = await getTranslations("dashboard.goals");
  const locale = await getLocale();
  const summary = await getGamificationSummary();
  const { currentUser, activeGoals, streakHistory, recentUnlocked } = summary;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("pageSubtitle")}</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentUser.currentStreak}</p>
            <p className="text-xs text-muted-foreground">{t("currentStreak")}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentUser.longestStreak}</p>
            <p className="text-xs text-muted-foreground">{t("longestStreak")}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentUser.unlockedAchievements}</p>
            <p className="text-xs text-muted-foreground">{t("activeGoalsCount", { n: currentUser.unlockedAchievements })}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentUser.totalScore}</p>
            <p className="text-xs text-muted-foreground">{t("totalScore")}</p>
          </div>
        </div>
      </div>

      {/* Streak heatmap */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t("streakHistory")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("last8Weeks")}</p>
        </div>
        {streakHistory.length > 0 ? (
          <StreakHeatmap entries={streakHistory} height={140} />
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            {t("noStreakData")}
          </div>
        )}
      </div>

      {/* Active goals */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t("activeGoals")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("activeGoalsCount", { n: activeGoals.length })}
          </p>
        </div>
        {activeGoals.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            {t("noGoals")}
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const pct = goal.dailyTarget > 0
                ? Math.min(Math.round((goal.todayProgress / goal.dailyTarget) * 100), 100)
                : 0;
              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {goal.labelKey
                          ? (tg as (key: string) => string)(`milestoneLabels.${goal.labelKey}`)
                          : goal.activityType}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(goal.todayProgress, locale)} / {formatNumber(goal.dailyTarget, locale)} {getUnitLabel(goal.unit, locale)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent unlocked achievements */}
      {recentUnlocked.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t("recentAchievements")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("unlocked")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentUnlocked.map((milestone) => (
              <div
                key={milestone.id}
                className="rounded-lg border border-border bg-background p-3 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {milestone.labelKey
                      ? (tg as (key: string) => string)(`milestoneLabels.${milestone.labelKey}`)
                      : milestone.activityType}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {milestone.unlockedAt ? formatDate(new Date(milestone.unlockedAt), locale) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function AchievementsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <GamificationGoalsContent />
    </Suspense>
  );
}
