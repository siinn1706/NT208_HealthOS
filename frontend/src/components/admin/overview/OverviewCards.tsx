"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { formatCount, UNAVAILABLE } from "@/lib/admin/formatting";
import type { PlanCode } from "@/lib/admin/plan-catalog";
import { KpiCard } from "./KpiCard";

export interface OverviewData {
  total_accounts: number;
  active_users: number;
  banned_users: number;
  online_users: number;
  total_plans: number;
  active_subscriptions: number;
  recommended_plan?: { code: PlanCode; label: string };
  recent_events?: Array<{ at: string; type: string; summary?: string }>;
  /** Optional sparkline arrays (7 data points each) — may be absent from older BFF responses. */
  sparklines?: {
    total_accounts?: number[];
    active_users?: number[];
    banned_users?: number[];
    online_users?: number[];
    active_subscriptions?: number[];
  };
}

export interface OverviewCardsProps {
  data: OverviewData | null;
  isLoading: boolean;
}

const KPI_CONFIGS = [
  { key: "total_accounts",      label: "Total Accounts",      sparklineKey: "total_accounts"      },
  { key: "active_users",        label: "Active Users",        sparklineKey: "active_users"        },
  { key: "banned_users",        label: "Banned Users",        sparklineKey: "banned_users"        },
  { key: "online_users",        label: "Online Users",        sparklineKey: "online_users"        },
  { key: "total_plans",         label: "Total Plans",         sparklineKey: undefined             },
  { key: "active_subscriptions",label: "Active Subs",         sparklineKey: "active_subscriptions"},
] as const;

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  const locale = useLocale();

  function fmt(n: number | undefined): string {
    if (data === null || n === undefined) return UNAVAILABLE;
    return formatCount(n, locale);
  }

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      aria-label="Overview metrics"
      aria-busy={isLoading}
    >
      {KPI_CONFIGS.map((cfg) => (
        <KpiCard
          key={cfg.key}
          label={cfg.label}
          value={fmt(data?.[cfg.key as keyof OverviewData] as number | undefined)}
          sparklineData={cfg.sparklineKey ? data?.sparklines?.[cfg.sparklineKey] : null}
          isLoading={isLoading}
        />
      ))}

      {/* Recommended plan card — renders only when BFF provides the field */}
      {data?.recommended_plan &&
        data.recommended_plan.label.length >= 1 &&
        data.recommended_plan.label.length <= 80 && (
          <KpiCard
            key="recommended_plan"
            label="Recommended Plan"
            value={data.recommended_plan.label}
            isLoading={false}
          />
        )}
    </div>
  );
}
