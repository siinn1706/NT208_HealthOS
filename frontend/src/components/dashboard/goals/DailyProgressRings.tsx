"use client";

import { cn } from "@/lib/utils";
import type { UserGoal } from "@/data/gamification";

interface DailyProgressRingsProps {
  goals: UserGoal[];
}

/** Pure SVG donut ring for a single goal */
function GoalRing({
  goal,
  size = 120,
}: {
  goal: UserGoal;
  size?: number;
}) {
  const pct = Math.min(goal.todayProgress / goal.dailyTarget, 1);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const isComplete = pct >= 1;

  const displayValue =
    goal.dailyTarget >= 1000
      ? `${(goal.todayProgress / 1000).toFixed(1)}k`
      : goal.todayProgress.toLocaleString();
  const targetValue =
    goal.dailyTarget >= 1000
      ? `${(goal.dailyTarget / 1000).toFixed(0)}k`
      : goal.dailyTarget.toLocaleString();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={goal.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-sm font-bold leading-none",
              isComplete ? "text-green-400" : "text-foreground"
            )}
          >
            {isComplete ? "✓" : `${Math.round(pct * 100)}%`}
          </span>
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-semibold text-foreground truncate max-w-[100px]">
          {goal.label}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {displayValue} / {targetValue}{" "}
          <span className="text-muted-foreground/60">{goal.unit}</span>
        </p>
      </div>
    </div>
  );
}

export function DailyProgressRings({ goals }: DailyProgressRingsProps) {
  const completed = goals.filter(
    (g) => g.todayProgress >= g.dailyTarget
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Tiến độ hôm nay
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completed}/{goals.length} mục tiêu hoàn thành
          </p>
        </div>
        {completed === goals.length && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
            🎉 Hoàn hảo!
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
        {goals.map((goal) => (
          <GoalRing key={goal.id} goal={goal} size={110} />
        ))}
      </div>
    </div>
  );
}
