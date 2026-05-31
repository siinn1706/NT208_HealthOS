"use client";

// PlansTable.tsx — table of subscription plans for the admin console
// Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 13.4, 13.5

import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/admin/shared/PlanBadge";
import { formatVnd } from "@/lib/admin/formatting";
import { isKnownPlanCode } from "@/lib/admin/plan-catalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
  id: string;
  code: string;
  name_vi: string;
  name_en: string;
  price_vnd: number;
  billing_period: string;
  is_recommended: boolean;
  is_active: boolean;
  sort_order: number;
  description: string;
  features: unknown;
  limits: unknown;
}

interface PlansTableProps {
  plans: SubscriptionPlan[];
  onEdit: (plan: SubscriptionPlan) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeInterval(period: string): string {
  switch (period.toLowerCase()) {
    case "monthly": return "Monthly";
    case "yearly":
    case "annual": return "Annual";
    case "lifetime": return "Lifetime";
    default: return period;
  }
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[var(--admin-status-success-soft)] text-[var(--admin-status-success)]"
          : "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[var(--admin-surface-muted)] text-[var(--admin-fg-muted)]"
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a table of subscription plans sorted by `sort_order` ascending.
 *
 * - Rows with unrecognized `code` values render a warning badge and have
 *   the Edit button disabled (R13.4, R13.5).
 * - `price_vnd` is formatted via `formatVnd` (R9.2).
 * - No payment / checkout / billing-provider controls are rendered (R9.7).
 */
export function PlansTable({ plans, onEdit }: PlansTableProps) {
  const sorted = plans.toSorted((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--admin-surface)]">
          <tr className="border-b border-[var(--admin-border)] text-left">
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">Tier</th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">Name</th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">Price</th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">Interval</th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">Status</th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((plan) => {
            const known = isKnownPlanCode(plan.code);
            return (
              <tr
                key={plan.id}
                className="border-b border-[var(--admin-border)] last:border-0 motion-safe:transition-colors hover:bg-[var(--admin-surface-muted)]"
              >
                {/* Tier badge */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {known ? (
                      <PlanBadge code={plan.code} variant="known" />
                    ) : (
                      <PlanBadge variant="warning">Unrecognized</PlanBadge>
                    )}
                    {plan.is_recommended && (
                      <span className="rounded-full bg-[var(--admin-brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--admin-brand)]">
                        Rec.
                      </span>
                    )}
                  </div>
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--admin-fg)]">{plan.name_en}</p>
                  <p className="text-xs text-[var(--admin-fg-muted)]">{plan.name_vi}</p>
                </td>

                {/* Price */}
                <td className="admin-tabular px-4 py-3 text-[var(--admin-fg)]">
                  {formatVnd(plan.price_vnd)}
                </td>

                {/* Interval */}
                <td className="px-4 py-3 text-[var(--admin-fg-muted)]">
                  {normalizeInterval(plan.billing_period)}
                </td>

                {/* Active status */}
                <td className="px-4 py-3">
                  <ActivePill active={plan.is_active} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!known}
                    onClick={() => onEdit(plan)}
                    aria-label={`Edit plan ${plan.code}`}
                    className="border-[var(--admin-border)] text-[var(--admin-fg)] hover:bg-[var(--admin-surface-muted)]"
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
