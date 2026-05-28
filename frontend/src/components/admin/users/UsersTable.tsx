"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserStatusBadge } from "./user-status-badge";
import { UserRowActions } from "./user-row-actions";
import { PlanBadge } from "@/components/admin/shared/PlanBadge";
import type { Density } from "@/components/admin/shared/density-toggle";

export interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string;
  status: "active" | "banned" | "deleted" | string;
  role: string | null;
  subscription: { plan_code: string; status: string } | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface UsersTableProps {
  users: UserRow[];
  sessionUserId: string | null;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  isLoading: boolean;
  density?: Density;
  visibleColumns?: Set<string>;
}

const SKELETON_ROW_COUNT = 8;

export const ALL_COLUMNS = [
  { key: "user",         label: "User",         hideable: false },
  { key: "email",        label: "Email" },
  { key: "status",       label: "Status" },
  { key: "role",         label: "Role" },
  { key: "subscription", label: "Subscription" },
  { key: "created_at",   label: "Created" },
  { key: "last_seen_at", label: "Last seen" },
  { key: "actions",      label: "",             hideable: false },
] as const;

export const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.map((c) => c.key));

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}

function cellPx(density: Density) {
  return density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr aria-hidden="true">
      {/* bulk-select disabled cell */}
      <td className="px-3 py-2 w-8">
        <Skeleton className="h-3.5 w-3.5 rounded" />
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <Skeleton className="h-4 w-24" />
        </td>
      ))}
    </tr>
  );
}

export function UsersTable({
  users,
  sessionUserId,
  onBan,
  onUnban,
  isLoading,
  density = "compact",
  visibleColumns = DEFAULT_VISIBLE,
}: UsersTableProps) {
  const visibleDefs = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key));
  const px = cellPx(density);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <table
        className="w-full min-w-[800px] text-sm"
        aria-label="Users"
      >
        <thead className="sticky top-0 z-10 bg-[var(--admin-surface-muted)]">
          <tr className="border-b border-[var(--admin-border)]">
            {/* Bulk-select column — disabled affordance */}
            <th
              scope="col"
              className="w-8 px-3 py-2"
              aria-label="Bulk select (not yet supported)"
            >
              <input
                type="checkbox"
                disabled
                aria-disabled="true"
                title="Bulk actions not yet supported"
                className="h-3.5 w-3.5 cursor-not-allowed opacity-40"
              />
            </th>

            {visibleDefs.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]",
                  px,
                  col.key === "actions" && "text-right",
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--admin-divider)]">
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
              <SkeletonRow key={i} colCount={visibleDefs.length} />
            ))
          ) : users.length === 0 ? (
            <tr>
              <td
                colSpan={visibleDefs.length + 1}
                className="px-4 py-10 text-center text-sm text-[var(--admin-fg-subtle)]"
              >
                No users found.
              </td>
            </tr>
          ) : (
            users.map((row) => {
              const isSelf = row.user_id === sessionUserId;

              return (
                <tr
                  key={row.user_id}
                  className="hover:bg-[var(--admin-surface-muted)] motion-safe:transition-colors motion-safe:duration-100"
                >
                  {/* Bulk-select cell */}
                  <td className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      disabled
                      aria-disabled="true"
                      title="Bulk actions not yet supported"
                      className="h-3.5 w-3.5 cursor-not-allowed opacity-40"
                    />
                  </td>

                  {visibleColumns.has("user") && (
                    <td className={cn(px, "min-w-0 max-w-[12rem]")}>
                      <p className="truncate font-medium text-[var(--admin-fg)]">
                        {row.display_name ?? <span className="italic text-[var(--admin-fg-muted)]">(no name)</span>}
                      </p>
                      <p className="admin-tabular truncate text-[11px] text-[var(--admin-fg-subtle)]">
                        {row.user_id.slice(0, 8)}…
                      </p>
                    </td>
                  )}

                  {visibleColumns.has("email") && (
                    <td className={cn(px, "min-w-0 max-w-[14rem] text-[var(--admin-fg-muted)]")}>
                      <span className="truncate block">{row.email}</span>
                    </td>
                  )}

                  {visibleColumns.has("status") && (
                    <td className={px}>
                      <UserStatusBadge status={row.status} />
                    </td>
                  )}

                  {visibleColumns.has("role") && (
                    <td className={cn(px, "text-[var(--admin-fg-muted)]")}>
                      {row.role ?? "—"}
                    </td>
                  )}

                  {visibleColumns.has("subscription") && (
                    <td className={px}>
                      {row.subscription ? (
                        <PlanBadge code={row.subscription.plan_code} />
                      ) : (
                        <span className="text-[var(--admin-fg-subtle)]">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.has("created_at") && (
                    <td className={cn(px, "admin-tabular text-[var(--admin-fg-muted)]")}>
                      <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                    </td>
                  )}

                  {visibleColumns.has("last_seen_at") && (
                    <td className={cn(px, "admin-tabular text-[var(--admin-fg-muted)]")}>
                      {row.last_seen_at
                        ? <time dateTime={row.last_seen_at}>{formatDate(row.last_seen_at)}</time>
                        : "—"}
                    </td>
                  )}

                  {visibleColumns.has("actions") && (
                    <td className={cn(px, "text-right")}>
                      <UserRowActions
                        userId={row.user_id}
                        displayName={row.display_name}
                        email={row.email}
                        status={row.status}
                        isSelf={isSelf}
                        onBan={onBan}
                        onUnban={onUnban}
                      />
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
