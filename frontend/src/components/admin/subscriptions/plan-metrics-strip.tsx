"use client";

// plan-metrics-strip.tsx — per-plan active subscriber mini-cards
// Renders only when metrics data is non-null (gracefully hidden otherwise).

import * as React from "react";
import { getPlanTierColor, PLAN_CATALOG, type PlanCode } from "@/lib/admin/plan-catalog";
import { planLabel } from "@/lib/admin/plan-catalog";

export interface PlanMetrics {
  free: number;
  basic: number;
  family: number;
  professional: number;
}

interface PlanMetricsStripProps {
  /** Per-plan active subscriber counts. Pass `null` to hide the strip. */
  metrics: PlanMetrics | null;
}

const PLAN_ORDER: PlanCode[] = ["free", "basic", "family", "professional"];

/** 4 mini-cards showing per-plan active subscriber counts. Hidden when metrics is null. */
export function PlanMetricsStrip({ metrics }: PlanMetricsStripProps) {
  if (!metrics) return null;

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="Plan subscriber metrics"
    >
      {PLAN_ORDER.map((code) => {
        const color = getPlanTierColor(code);
        const count = metrics[code];
        return (
          <div
            key={code}
            className="flex flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: color ?? "var(--admin-fg-muted)" }}
            >
              {planLabel(code, "en")}
            </span>
            <span
              className="admin-tabular text-2xl font-semibold text-[var(--admin-fg)]"
              aria-label={`${planLabel(code, "en")} active subscribers`}
            >
              {count.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--admin-fg-muted)]">active subs</span>
          </div>
        );
      })}
    </div>
  );
}
