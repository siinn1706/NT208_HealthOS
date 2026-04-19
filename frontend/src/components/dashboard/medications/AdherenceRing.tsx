"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Adherence } from "@/types/api";

interface AdherenceRingProps {
  adherence: Adherence | null;
  /** Outer diameter in pixels. Defaults to 64. */
  size?: number;
  /** Stroke thickness. Defaults to 6. */
  stroke?: number;
  className?: string;
}

/**
 * Tiny SVG progress ring + percent label. Renders "—" when there are no
 * scheduled doses in the period (avoids showing a misleading 0%).
 */
export function AdherenceRing({
  adherence,
  size = 64,
  stroke = 6,
  className,
}: AdherenceRingProps) {
  const t = useTranslations("dashboard.medications.detail.adherence");
  const empty = !adherence || adherence.scheduled === 0;
  const percent = empty ? 0 : Math.max(0, Math.min(100, adherence.percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  // P3-aria-i18n / review M18 — pull both labels from `next-intl` so screen
  // readers in any locale read the right text. Clamping percent here too so
  // the announcement matches the visible glyph.
  const ariaLabel = empty
    ? t("ariaEmpty")
    : t("ariaLabel", {
        percent,
        taken: adherence!.taken,
        scheduled: adherence!.scheduled,
      });

  // Color band: <50 destructive, 50-79 warm-gold, >=80 emerald.
  const stroke_color =
    empty || percent < 50
      ? "var(--destructive, #ef4444)"
      : percent < 80
      ? "var(--color-warm-gold, #E7B500)"
      : "#10b981";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border, #e5e7eb)"
          strokeWidth={stroke}
        />
        {!empty && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke_color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        )}
      </svg>
      <span className="absolute text-xs font-semibold text-foreground">
        {empty ? "—" : `${percent}%`}
      </span>
    </div>
  );
}
