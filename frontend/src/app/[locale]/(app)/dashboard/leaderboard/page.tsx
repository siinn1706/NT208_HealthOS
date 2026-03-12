import { ComingSoon } from "@/components/ui/ComingSoon";

export default function LeaderboardPage() {
  return <ComingSoon />;
}
          <p className="text-sm text-muted-foreground mt-0.5">
            So sánh điểm với cộng đồng — cập nhật theo tuần
          </p>
        </div>
        <GamificationSubNav />
      </div>

      {/* ── Your rank card ── */}
      <div className="rounded-xl border border-[#1965B3]/40 bg-[#1965B3]/10 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#16A34A] flex items-center justify-center text-xl font-bold text-white">
              A
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {currentUser.displayName}
              </p>
              <p className="text-sm text-muted-foreground">
                Hạng{" "}
                <span className="text-[#41BCE6] font-bold">
                  #{currentUser.globalRank}
                </span>{" "}
                toàn cầu
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: Star,
                label: "Tổng điểm",
                value: currentUser.totalScore.toLocaleString(),
                color: "#FBBF24",
              },
              {
                icon: Flame,
                label: "Streak",
                value: `${currentUser.currentStreak} ngày`,
                color: "#F97316",
              },
              {
                icon: Trophy,
                label: "Huy hiệu",
                value: `${currentUser.unlockedAchievements}`,
                color: "#A78BFA",
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="text-center">
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                <p className="text-base font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Score formula info ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground">Cách tính điểm xếp hạng</p>
          <p>
            <span className="text-yellow-400 font-medium">
              Điểm thành tựu
            </span>{" "}
            (mỗi huy hiệu đã nhận) +{" "}
            <span className="text-orange-400 font-medium">Streak × 10</span> +{" "}
            <span className="text-green-400 font-medium">
              BMI Score (0–100)
            </span>
          </p>
          <p>
            BMI hiện tại của bạn:{" "}
            <span className="text-foreground font-medium">
              {bmi.bmi.toFixed(1)}
            </span>{" "}
            → +
            <span className="text-green-400 font-medium">{bmi.bmiScore}</span>{" "}
            điểm BMI
          </p>
        </div>
      </div>

      {/* ── Leaderboard table ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Medal className="w-4 h-4 text-[#41BCE6]" />
          <p className="text-sm font-semibold text-foreground">
            Top {entries.length} người dùng
          </p>
        </div>
        <LeaderboardTable entries={entries} />
      </div>

      {/* ── Score breakdown for current user ── */}
      {currentUserEntry && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Chi tiết điểm của bạn
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Điểm thành tựu",
                value: currentUser.unlockedAchievements * 100,
                subtitle: `${currentUser.unlockedAchievements} huy hiệu × ~100 điểm`,
                color: "#A78BFA",
              },
              {
                label: "Điểm Streak",
                value: currentUser.currentStreak * 10,
                subtitle: `${currentUser.currentStreak} ngày × 10 điểm`,
                color: "#F97316",
              },
              {
                label: "Điểm BMI",
                value: bmi.bmiScore,
                subtitle: `BMI ${bmi.bmi.toFixed(1)} — ${bmi.status === "normal" ? "Tốt!" : "Hướng tới BMI 22"}`,
                color: "#4ADE80",
              },
            ].map(({ label, value, subtitle, color }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color }}
                  >
                    +{value}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
