"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { UserStatusBadge } from "@/components/admin/users/user-status-badge";
import { PlanBadge } from "@/components/admin/shared/PlanBadge";
import { relativeTime } from "@/lib/admin/relative-time";
import type { UserDetail } from "./ProfileSection";

interface UserDetailRailProps {
  user: UserDetail;
}

function RailGroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
      {children}
    </p>
  );
}

function RailDivider() {
  return <hr className="border-[var(--admin-divider)]" />;
}

export function UserDetailRail({ user }: UserDetailRailProps) {
  const tp = useTranslations("admin.userDetail.profile");
  const ts = useTranslations("admin.userDetail.subscription");
  const initials = (user.display_name ?? user.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside
      className="flex flex-col gap-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"
      aria-label="User profile summary"
    >
      {/* ── Identity ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-full bg-[var(--admin-brand-soft)] text-xl font-semibold text-[var(--admin-brand)]"
          aria-hidden="true"
        >
          {initials || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--admin-fg)]">
            {user.display_name ?? (
              <span className="italic text-[var(--admin-fg-muted)]">{tp("noName")}</span>
            )}
          </p>
          <p className="mt-0.5 break-all text-xs text-[var(--admin-fg-muted)]">{user.email}</p>
        </div>
        {/* aria-live so screen readers announce status after ban/unban */}
        <div aria-live="polite" aria-atomic="true">
          <UserStatusBadge status={user.status} />
        </div>
      </div>

      <RailDivider />

      {/* ── Meta ─────────────────────────────────────────────────────── */}
      <div>
        <RailGroupHeading>Meta</RailGroupHeading>
        <dl className="space-y-3 text-sm">
          {user.subscription && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--admin-fg-muted)]">{ts("plan")}</dt>
              <dd><PlanBadge code={user.subscription.plan_code} /></dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--admin-fg-muted)]">{tp("createdAt")}</dt>
            <dd className="admin-tabular text-xs text-[var(--admin-fg)]" title={user.created_at}>
              {relativeTime(user.created_at)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--admin-fg-muted)]">{tp("lastSeen")}</dt>
            <dd
              className="admin-tabular text-xs text-[var(--admin-fg)]"
              title={user.last_seen_at ?? "never"}
            >
              {user.last_seen_at ? relativeTime(user.last_seen_at) : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── Access ───────────────────────────────────────────────────── */}
      {((user.roles && user.roles.length > 0) || (user.permissions && user.permissions.length > 0)) && (
        <>
          <RailDivider />
          <div className="space-y-4">
            {user.roles && user.roles.length > 0 && (
              <div>
                <RailGroupHeading>{tp("roles")}</RailGroupHeading>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-[var(--admin-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-fg)] motion-safe:transition-colors"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user.permissions && user.permissions.length > 0 && (
              <div>
                <RailGroupHeading>Permissions</RailGroupHeading>
                <div className="flex flex-wrap gap-1">
                  {user.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-md bg-[var(--admin-status-info-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-status-info)] motion-safe:transition-colors"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
