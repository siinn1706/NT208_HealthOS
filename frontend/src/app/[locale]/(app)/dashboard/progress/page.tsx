import { Target, Flame, Trophy, Star, TrendingUp } from "lucide-react";
import { getGamificationSummary } from "@/lib/gamification-data";
import { GamificationSubNav } from "@/components/dashboard/gamification/GamificationSubNav";
import { BmiScoreCard } from "@/components/dashboard/gamification/BmiScoreCard";
import { DailyProgressRings } from "@/components/dashboard/goals/DailyProgressRings";
import { StreakCalendar } from "@/components/dashboard/goals/StreakCalendar";
import { BadgeCard } from "@/components/dashboard/gamification/BadgeCard";
import { AddGoalButton } from "@/components/dashboard/goals/AddGoalButton";
import { cn } from "@/lib/utils";

export default async function ProgressPage() {
  const summary = await getGamificationSummary();
  const { currentUser, bmi, activeGoals, streakHistory, recentUnlocked } = summary;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mục tiêu & Tiến độ</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi hành trình luyện tập và nhận huy hiệu thành tựu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GamificationSubNav />
          <AddGoalButton />
        </div>
      </div>

      {/* ── Row 1: Score summary strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: Star,
            label: "Tổng điểm",
            value: currentUser.totalScore.toLocaleString(),
            color: "#FBBF24",
          },
          {
            icon: TrendingUp,
            label: "Xếp hạng toàn cầu",
            value: `#${currentUser.globalRank}`,
            color: "#41BCE6",
          },
          {
            icon: Flame,
            label: "Streak hiện tại",
            value: `${currentUser.currentStreak} ngày`,
            color: "#F97316",
          },
          {
            icon: Trophy,
            label: "Thành tựu",
            value: `${currentUser.unlockedAchievements}/${currentUser.totalAchievements}`,
            color: "#A78BFA",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground truncate">{value}</p>
              <p className="text-[11px] text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: BMI + Daily Progress Rings ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BmiScoreCard bmi={bmi} />
        </div>
        <div className="lg:col-span-3">
          <DailyProgressRings goals={activeGoals} />
        </div>
      </div>

      {/* ── Row 3: Active goals list ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Mục tiêu đang theo dõi</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {activeGoals.length} mục tiêu
          </span>
        </div>
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const pct = Math.min(
              Math.round((goal.todayProgress / goal.dailyTarget) * 100),
              100
            );
            const isDone = pct >= 100;
            return (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {goal.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {goal.todayProgress.toLocaleString()} /{" "}
                      {goal.dailyTarget.toLocaleString()} {goal.unit}
                    </span>
                    {isDone && (
                      <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
                        ✓ Xong
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-[width] duration-700 ease-out"
                    )}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: goal.color,
                    }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 4: Streak Calendar ── */}
      <StreakCalendar
        history={streakHistory}
        currentStreak={currentUser.currentStreak}
        longestStreak={currentUser.longestStreak}
      />

      {/* ── Row 5: Recently unlocked badges ── */}
      {recentUnlocked.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Thành tựu gần đây
            </p>
            <a
              href="achievements"
              className="text-xs text-primary hover:underline"
            >
              Xem tất cả →
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {recentUnlocked.map((m) => (
              <BadgeCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
