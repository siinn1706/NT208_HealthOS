"use client";

/**
 * ProgressRing — circular progress primitive.
 *
 * Used for "near-unlock" milestone affordances and any small, glanceable
 * percentage display that benefits from being radially compact (header chips,
 * goal cards). Mirrors the tone vocabulary of the linear `Progress` component.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ProgressTone } from "./progress";

export interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value?: number;
  max?: number;
  tone?: ProgressTone;
  /** Outer diameter in px. Defaults to 40. */
  size?: number;
  /** Stroke thickness in px. Defaults to ~10% of `size`. */
  strokeWidth?: number;
  /** Renders the value/percent inside the ring. */
  showLabel?: boolean;
  "aria-label"?: string;
}

const TONE_STROKE: Record<ProgressTone, string> = {
  default: "stroke-primary",
  success: "stroke-emerald-500 dark:stroke-emerald-400",
  warning: "stroke-amber-500 dark:stroke-amber-400",
  destructive: "stroke-destructive",
  info: "stroke-sky-500 dark:stroke-sky-400",
};

export function ProgressRing({
  value = 0,
  max = 100,
  tone = "default",
  size = 40,
  strokeWidth,
  showLabel = false,
  className,
  ...rest
}: ProgressRingProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(safeMax, value));
  const pct = (clamped / safeMax) * 100;

  const sw = strokeWidth ?? Math.max(2, Math.round(size * 0.1));
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        {...rest}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn("transition-[stroke-dasharray] duration-300 ease-out", TONE_STROKE[tone])}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-[10px] font-semibold tabular-nums text-foreground">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
