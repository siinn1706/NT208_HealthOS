// audit-table.tsx — sticky-thead log table with admin tokens and empty state

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  event: string;
  target?: string;
  meta?: string;
}

interface AuditTableProps {
  events: AuditEvent[];
}

/** Audit log table. Shows polished empty state when events array is empty. */
export function AuditTable({ events }: AuditTableProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--admin-fg-muted)]">
          No audit events match the current filters.
        </p>
        <p className="text-xs text-[var(--admin-fg-subtle)]">
          Events will appear here once the audit endpoint is wired.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--admin-surface)]">
          <tr className="border-b border-[var(--admin-border)] text-left">
            {["Timestamp", "Actor", "Event", "Target", "Meta"].map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr
              key={ev.id}
              className="border-b border-[var(--admin-border)] last:border-0 motion-safe:transition-colors hover:bg-[var(--admin-surface-muted)]"
            >
              <td className="admin-tabular px-4 py-3 text-xs text-[var(--admin-fg-muted)]">
                {ev.at}
              </td>
              <td className="px-4 py-3 text-[var(--admin-fg)]">{ev.actor}</td>
              <td className="px-4 py-3 font-medium text-[var(--admin-fg)]">{ev.event}</td>
              <td className="px-4 py-3 text-[var(--admin-fg-muted)]">{ev.target ?? "—"}</td>
              <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-[var(--admin-fg-muted)]">
                {ev.meta ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
