"use client";

/**
 * Progress — shadcn-style linear progress bar primitive.
 *
 * Single source of truth for any "x of y" or "% complete" affordance across
 * progress, achievements, leaderboard, and chat upload UIs.
 *
 * Usage:
 *   <Progress value={current} max={target} tone="success" />
 *   <Progress indeterminate aria-label="Uploading…" />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type ProgressTone =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value. Ignored when `indeterminate` is true. */
  value?: number;
  /** Upper bound. Defaults to 100 (treat `value` as a percentage). */
  max?: number;
  /** Visual tone — drives the fill colour token. */
  tone?: ProgressTone;
  /** Render an animated indeterminate bar (e.g. for uploads). */
  indeterminate?: boolean;
  /** Track height. Defaults to `h-2`. */
  size?: "xs" | "sm" | "md" | "lg";
  /** Accessible label. Required when there is no nearby visible label. */
  "aria-label"?: string;
}

const TONE_CLASS: Record<ProgressTone, string> = {
  default: "bg-primary",
  success: "bg-emerald-500 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  destructive: "bg-destructive",
  info: "bg-sky-500 dark:bg-sky-400",
};

const SIZE_CLASS: Record<NonNullable<ProgressProps["size"]>, string> = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function Progress({
  value = 0,
  max = 100,
  tone = "default",
  indeterminate = false,
  size = "md",
  className,
  ...rest
}: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(safeMax, value));
  const pct = indeterminate ? null : (clamped / safeMax) * 100;

  return (
    <div
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role -- Custom progress track keeps shadcn styling while exposing progressbar semantics.
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-busy={indeterminate || undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        SIZE_CLASS[size],
        className
      )}
      {...rest}
    >
      {indeterminate ? (
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-1/3 rounded-full",
            "animate-[progress-indeterminate_1.4s_ease-in-out_infinite]",
            TONE_CLASS[tone]
          )}
        />
      ) : (
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            TONE_CLASS[tone]
          )}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
