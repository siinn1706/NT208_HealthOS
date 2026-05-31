"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { relativeTime } from "@/lib/admin/relative-time";
import { adminFetch, AdminFetchError } from "@/lib/admin/bff-admin-client";

export interface SubscriptionHistoryEntry {
  id: string;
  actor: string | null;
  plan_code: string;
  status: string;
  expires_at: string | null;
  admin_note: string | null;
  created_at: string;
}

interface HistoryResponse {
  data: SubscriptionHistoryEntry[];
}

interface SubscriptionHistoryTableProps {
  userId: string;
  refreshTrigger?: number;
}

type HistoryState =
  | { status: "loading" }
  | { status: "success"; entries: SubscriptionHistoryEntry[] }
  | { status: "error"; reason: string };

const SKELETON_CELL_WIDTHS = [
  ["actor", "w-40"],
  ["plan", "w-56"],
  ["status", "w-32"],
  ["expiry", "w-40"],
  ["note", "w-48"],
  ["created", "w-64"],
] as const;

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {SKELETON_CELL_WIDTHS.map(([key, widthClass]) => (
        // oxlint-disable-next-line react-doctor/control-has-associated-label -- Skeleton cell is hidden placeholder content with no interactive control.
        <td key={key} className="px-4 py-3">
          <div aria-hidden="true" className={`h-3 ${widthClass} rounded bg-[var(--admin-surface-muted)]`} />
        </td>
      ))}
    </tr>
  );
}

export function SubscriptionHistoryTable({ userId, refreshTrigger }: SubscriptionHistoryTableProps) {
  const t = useTranslations("admin.userDetail.subscription");
  const tc = useTranslations("admin.common");
  const [state, setState] = React.useState<HistoryState>({ status: "loading" });

  const load = React.useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await adminFetch<HistoryResponse>(
        `/api/v1/admin/users/${userId}/subscription/history`,
      );
      setState({ status: "success", entries: res.data });
    } catch (err) {
      setState({
        status: "error",
        reason: err instanceof AdminFetchError
          ? `Failed to load history (${err.status}).`
          : "Failed to load history.",
      });
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="border-b border-[var(--admin-divider)] px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
          {t("history.title")}
        </p>
      </div>

      {state.status === "loading" && (
        <table className="w-full text-sm" aria-busy="true" aria-label="Loading assignment history">
          <tbody className="divide-y divide-[var(--admin-divider)]">
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <p className="text-sm text-[var(--admin-fg-muted)]">{state.reason}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-[var(--admin-brand)] underline-offset-4 hover:underline motion-safe:transition-colors"
          >
            {tc("retry")}
          </button>
        </div>
      )}

      {state.status === "success" && state.entries.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-[var(--admin-fg-muted)]">
          {t("history.empty")}
        </p>
      )}

      {state.status === "success" && state.entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-divider)]">
                {(["when", "actor", "plan", "status", "expires", "note"] as const).map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]"
                  >
                    {t(`history.columns.${h}` as Parameters<typeof t>[0])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-divider)]">
              {state.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--admin-surface-muted)] motion-safe:transition-colors">
                  <td className="admin-tabular whitespace-nowrap px-4 py-3 text-xs text-[var(--admin-fg-muted)]">
                    <time dateTime={entry.created_at} title={entry.created_at}>
                      {relativeTime(entry.created_at)}
                    </time>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-fg)]">
                    {entry.actor ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[var(--admin-surface-muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--admin-fg)]">
                      {entry.plan_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-fg-muted)]">
                    {entry.status}
                  </td>
                  <td className="admin-tabular whitespace-nowrap px-4 py-3 text-xs text-[var(--admin-fg-muted)]">
                    {entry.expires_at ? (
                      <time dateTime={entry.expires_at} title={entry.expires_at}>
                        {relativeTime(entry.expires_at)}
                      </time>
                    ) : "—"}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-xs text-[var(--admin-fg-muted)]" title={entry.admin_note ?? undefined}>
                    {entry.admin_note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
