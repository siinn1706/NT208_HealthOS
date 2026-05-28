"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

export interface KpiCardProps {
  label: string;
  value: string;
  /** Delta string, e.g. "+12%" or "-3". Positive shown in green, negative in red. */
  delta?: string | null;
  sparklineData?: number[] | null;
  sparklineColor?: string;
  isLoading?: boolean;
  className?: string;
}

function DeltaPill({ delta }: { delta: string }) {
  const isPositive = delta.startsWith("+");
  const isNegative = delta.startsWith("-");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        isPositive && "bg-[var(--admin-status-success-soft)] text-[var(--admin-status-success)]",
        isNegative && "bg-[var(--admin-status-danger-soft)] text-[var(--admin-status-danger)]",
        !isPositive && !isNegative && "bg-[var(--admin-surface-muted)] text-[var(--admin-fg-muted)]",
      )}
    >
      {delta}
    </span>
  );
}

/** KPI card with label, large tabular value, optional delta pill, optional sparkline. */
export function KpiCard({
  label,
  value,
  delta,
  sparklineData,
  sparklineColor = "var(--admin-brand)",
  isLoading = false,
  className,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4", className)}>
        <Skeleton className="mb-2 h-3.5 w-24" />
        <Skeleton className="mb-3 h-7 w-20" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4",
        "flex flex-col gap-1",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-fg-muted)]">
        {label}
      </p>

      <div className="flex items-baseline gap-2">
        <span className="admin-tabular text-2xl font-bold text-[var(--admin-fg)]">
          {value}
        </span>
        {delta && <DeltaPill delta={delta} />}
      </div>

      {/* Sparkline strip */}
      <div className="mt-1 h-8 text-[var(--admin-brand)]">
        <Sparkline
          data={sparklineData}
          height={32}
          color={sparklineColor}
        />
      </div>
    </div>
  );
}
