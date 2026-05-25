"use client";

import * as React from "react";

interface SparklineProps {
  /** Data points (0–N). Empty or null renders a flat line. */
  data: number[] | null | undefined;
  /** SVG width. Defaults to 100% of container. */
  width?: number;
  height?: number;
  /** Stroke color — defaults to currentColor. */
  color?: string;
  strokeWidth?: number;
}

/** Normalize data to [0, 1] range. */
function normalize(data: number[]): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  if (max === min) return data.map(() => 0.5);
  return data.map((v) => (v - min) / (max - min));
}

/**
 * Pure-SVG sparkline strip.
 * Respects prefers-reduced-motion — animation is skipped when motion is reduced.
 */
export function Sparkline({
  data,
  height = 32,
  color = "currentColor",
  strokeWidth = 1.5,
}: SparklineProps) {
  const hasData = Array.isArray(data) && data.length >= 2;

  if (!hasData) {
    return (
      <svg
        width="100%"
        height={height}
        aria-hidden="true"
        className="text-[var(--admin-fg-subtle)]"
      >
        <line
          x1="0"
          y1={height / 2}
          x2="100%"
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.4}
        />
      </svg>
    );
  }

  const pts = normalize(data!);
  const pad = 2;
  const viewH = height - pad * 2;

  // Build polyline points as percentages
  const points = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = pad + (1 - v) * viewH;
      return `${x}%,${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="motion-safe:animate-[sparkline-draw_0.6s_ease-out_both]"
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
    </svg>
  );
}
