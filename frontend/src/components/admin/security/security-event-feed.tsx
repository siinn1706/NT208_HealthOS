// security-event-feed.tsx — chronological security event list with severity pills

import { SeverityPill } from "./severity-pill";

export interface SecurityEvent {
  id: string;
  at: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  actor?: string;
  summary?: string;
}

interface SecurityEventFeedProps {
  events: SecurityEvent[];
}

/** Chronological list of security events. Renders a polished empty state when empty. */
export function SecurityEventFeed({ events }: SecurityEventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--admin-fg-muted)]">No security events to display.</p>
        <p className="text-xs text-[var(--admin-fg-subtle)]">Events will appear here once the security feed endpoint is wired.</p>
      </div>
    );
  }

  return (
    <ol
      className="flex flex-col divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"
      aria-label="Security event feed"
    >
      {events.map((ev) => (
        <li key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--admin-surface-muted)]">
          <div className="mt-0.5 shrink-0">
            <SeverityPill severity={ev.severity} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--admin-fg)]">{ev.type}</p>
            {ev.summary && (
              <p className="mt-0.5 truncate text-xs text-[var(--admin-fg-muted)]">{ev.summary}</p>
            )}
            {ev.actor && (
              <p className="mt-0.5 text-xs text-[var(--admin-fg-muted)]">
                Actor: <span className="font-medium text-[var(--admin-fg)]">{ev.actor}</span>
              </p>
            )}
          </div>
          <time
            dateTime={ev.at}
            className="admin-tabular shrink-0 text-xs text-[var(--admin-fg-muted)]"
          >
            {ev.at}
          </time>
        </li>
      ))}
    </ol>
  );
}
