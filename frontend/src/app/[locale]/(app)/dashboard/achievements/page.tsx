import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import { getMilestonesGrouped, getGamificationSummary } from "@/lib/gamification-data";
import { GamificationSubNav } from "@/components/dashboard/gamification/GamificationSubNav";
import { BadgeCard } from "@/components/dashboard/gamification/BadgeCard";
import { ACTIVITY_CONFIG, type ActivityType } from "@/data/gamification";

const ACTIVITY_ORDER: ActivityType[] = [
  "running",
  "steps",
  "cycling",
  "swimming",
];

export default async function AchievementsPage() {
  const [grouped, summary] = await Promise.all([
    getMilestonesGrouped(),
    getGamificationSummary(),
  ]);

  const { currentUser } = summary;
  const totalUnlocked = currentUser.unlockedAchievements;
  const totalAll = currentUser.totalAchievements;
  const inProgress = Object.values(grouped)
    .flat()
    .filter((m) => m.status === "in-progress").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Thành tựu & Huy hiệu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Duy trì ≥ 5 ngày/tuần × 4 tuần để mở khóa từng huy hiệu
          </p>
        </div>
        <GamificationSubNav />
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-foreground">
              {totalUnlocked}
            </p>
            <p className="text-[11px] text-muted-foreground">Đã đạt</p>
          </div>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-foreground">{inProgress}</p>
            <p className="text-[11px] text-muted-foreground">Đang tiến hành</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-center gap-3">
          <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-foreground">
              {totalAll - totalUnlocked - inProgress}
            </p>
            <p className="text-[11px] text-muted-foreground">Chưa mở khóa</p>
          </div>
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Tiến độ tổng thể
          </p>
          <span className="text-sm font-bold text-[#41BCE6]">
            {totalUnlocked}/{totalAll} huy hiệu
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-[#1965B3] to-[#41BCE6] transition-[width] duration-700"
            style={{
              width: `${Math.round((totalUnlocked / totalAll) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.round((totalUnlocked / totalAll) * 100)}% hoàn thành —{" "}
          {totalAll - totalUnlocked} huy hiệu còn lại
        </p>
      </div>

      {/* ── Activity sections ── */}
      {ACTIVITY_ORDER.map((type) => {
        const milestones = grouped[type];
        if (!milestones || milestones.length === 0) return null;
        const config = ACTIVITY_CONFIG[type];
        const unlocked = milestones.filter((m) => m.status === "unlocked").length;

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {config.labelVi}
                </p>
                <p className="text-xs text-muted-foreground">
                  {unlocked}/{milestones.length} huy hiệu đã đạt
                </p>
              </div>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {milestones.map((m) => (
                <BadgeCard key={m.id} milestone={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
