"use client";

import * as React from "react";
import { PlanBadge } from "@/components/admin/shared/PlanBadge";
import { relativeTime } from "@/lib/admin/relative-time";
import type { UserSubscription } from "./ProfileSection";

interface CurrentSubscriptionCardProps {
  subscription: UserSubscription | null;
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active:   "bg-[var(--admin-status-success-soft)] text-[var(--admin-status-success)]",
    trialing: "bg-[var(--admin-status-info-soft)] text-[var(--admin-status-info)]",
    canceled: "bg-[var(--admin-status-warning-soft)] text-[var(--admin-status-warning)]",
    past_due: "bg-[var(--admin-status-danger-soft)] text-[var(--admin-status-danger)]",
    expired:  "bg-[var(--admin-surface-muted)] text-[var(--admin-fg-muted)]",
  };
  const cls = colorMap[status] ?? "bg-[var(--admin-surface-muted)] text-[var(--admin-fg-muted)]";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function CurrentSubscriptionCard({ subscription }: CurrentSubscriptionCardProps) {
  if (!subscription) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--admin-fg-muted)]">No subscription</p>
        <p className="text-xs text-[var(--admin-fg-subtle)]">Use the form below to assign a plan.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
        Current subscription
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <PlanBadge code={subscription.plan_code} />
        <StatusPill status={subscription.status} />
        {subscription.expires_at && (
          <time
            dateTime={subscription.expires_at}
            title={subscription.expires_at}
            className="admin-tabular text-xs text-[var(--admin-fg-muted)]"
          >
            Expires {relativeTime(subscription.expires_at)}
          </time>
        )}
      </div>
      {subscription.admin_note && (
        <p className="mt-3 line-clamp-2 text-xs text-[var(--admin-fg-muted)]">
          {subscription.admin_note}
        </p>
      )}
    </div>
  );
}
