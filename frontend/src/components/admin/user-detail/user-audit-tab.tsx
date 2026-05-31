"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { adminFetch, AdminFetchError } from "@/lib/admin/bff-admin-client";
import { relativeTime } from "@/lib/admin/relative-time";

interface AuditEvent {
  id: string;
  action: string;
  actor: string | null;
  detail: string | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditEvent[];
}

interface UserAuditTabProps {
  userId: string;
}

type AuditState =
  | { status: "loading" }
  | { status: "success"; events: AuditEvent[] }
  | { status: "error"; reason: string };

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3">
      <div className="h-3 w-24 rounded bg-[var(--admin-surface-muted)]" />
      <div className="h-3 w-32 rounded bg-[var(--admin-surface-muted)]" />
      <div className="ml-auto h-3 w-16 rounded bg-[var(--admin-surface-muted)]" />
    </div>
  );
}

export function UserAuditTab({ userId }: UserAuditTabProps) {
  const t = useTranslations("admin.userDetail.activity");
  const [state, setState] = React.useState<AuditState>({ status: "loading" });

  const load = React.useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await adminFetch<AuditResponse>(`/api/v1/admin/users/${userId}/audit`);
      setState({ status: "success", events: res.data });
    } catch (err) {
      setState({
        status: "error",
        reason: err instanceof AdminFetchError
          ? `Failed to load activity (${err.status}).`
          : "Failed to load activity.",
      });
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      aria-labelledby="audit-tab-heading"
      aria-busy={state.status === "loading"}
      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"
    >
      <div className="border-b border-[var(--admin-divider)] px-5 py-4">
        <h2
          id="audit-tab-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]"
        >
          {t("heading")}
        </h2>
      </div>

      {state.status === "loading" && (
        <div className="divide-y divide-[var(--admin-divider)]">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-[var(--admin-fg-muted)]">{state.reason}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-[var(--admin-brand)] underline-offset-4 hover:underline motion-safe:transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {state.status === "success" && state.events.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-[var(--admin-fg-muted)]">
          {t("empty")}
        </p>
      )}

      {state.status === "success" && state.events.length > 0 && (
        <ul className="divide-y divide-[var(--admin-divider)]">
          {state.events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 text-[var(--admin-fg)]">
                <span className="font-medium">{ev.action}</span>
                {ev.detail && (
                  <span className="ml-1 text-[var(--admin-fg-muted)]">: {ev.detail}</span>
                )}
                {ev.actor && (
                  <span className="ml-1 text-[var(--admin-fg-subtle)] text-xs">by {ev.actor}</span>
                )}
              </span>
              <time
                dateTime={ev.created_at}
                title={ev.created_at}
                className="admin-tabular shrink-0 text-xs text-[var(--admin-fg-muted)]"
              >
                {relativeTime(ev.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
