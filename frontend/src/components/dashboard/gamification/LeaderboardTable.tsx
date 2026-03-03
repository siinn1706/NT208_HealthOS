"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/data/gamification";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

const RANK_ICONS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return <span className="text-muted-foreground text-[10px]">—</span>;
  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        change > 0 ? "text-green-400" : "text-red-400"
      )}
    >
      {change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
    </span>
  );
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const currentUserEntry = entries.find((e) => e.isCurrentUser);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <div className="grid grid-cols-[40px_1fr_80px_70px_60px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>#</span>
          <span>Người dùng</span>
          <span className="text-right">Điểm</span>
          <span className="text-right hidden sm:block">Streak</span>
          <span className="text-right hidden sm:block">Thay đổi</span>
        </div>
      </div>

      {/* Top 3 highlight */}
      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const isTop3 = entry.rank <= 3;
          const rankIcon = RANK_ICONS[entry.rank];

          return (
            <div
              key={entry.userId}
              className={cn(
                "px-5 py-3 transition-colors duration-200",
                "grid grid-cols-[40px_1fr_80px_70px_60px] gap-2 items-center",
                entry.isCurrentUser
                  ? "bg-[#1965B3]/15 border-l-2 border-l-[#41BCE6]"
                  : "hover:bg-muted/30",
                isTop3 && !entry.isCurrentUser && "bg-muted/10"
              )}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8">
                {rankIcon ? (
                  <span className="text-xl">{rankIcon}</span>
                ) : (
                  <span
                    className={cn(
                      "text-sm font-bold",
                      entry.isCurrentUser
                        ? "text-[#41BCE6]"
                        : "text-muted-foreground"
                    )}
                  >
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: entry.avatarColor }}
                >
                  {entry.avatarInitial}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      entry.isCurrentUser ? "text-[#41BCE6]" : "text-foreground"
                    )}
                  >
                    {entry.displayName}
                    {entry.isCurrentUser && (
                      <span className="ml-1.5 text-[9px] font-semibold text-[#41BCE6] bg-[#41BCE6]/10 px-1.5 py-0.5 rounded-full">
                        Bạn
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.achievementsCount} huy hiệu
                  </p>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-bold",
                    entry.isCurrentUser ? "text-[#41BCE6]" : "text-foreground"
                  )}
                >
                  {entry.totalScore.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">điểm</p>
              </div>

              {/* Streak */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-orange-400">
                  🔥 {entry.currentStreak}
                </p>
                <p className="text-[10px] text-muted-foreground">ngày</p>
              </div>

              {/* Weekly change */}
              <div className="text-right hidden sm:flex justify-end">
                <ChangeIndicator change={entry.weeklyChange} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating "Your rank" summary if current user not visible */}
      {currentUserEntry && currentUserEntry.rank > 10 && (
        <div className="px-5 py-3 border-t-2 border-[#41BCE6]/30 bg-[#1965B3]/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Xếp hạng của bạn:{" "}
              <span className="font-bold text-[#41BCE6]">
                #{currentUserEntry.rank}
              </span>
            </p>
            <p className="text-xs font-bold text-[#41BCE6]">
              {currentUserEntry.totalScore.toLocaleString()} điểm
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
