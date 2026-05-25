"use client";

// audit-page-shell.tsx — client shell wiring AuditToolbar + AuditTable with local filter state

import * as React from "react";
import { AuditToolbar, type AuditFilters } from "./audit-toolbar";
import { AuditTable, type AuditEvent } from "./audit-table";

const EMPTY_FILTERS: AuditFilters = { from: "", to: "", actor: "", eventType: "" };

interface AuditPageShellProps {
  /** Pre-fetched events; empty array renders the polished empty state. */
  events?: AuditEvent[];
}

/** Client shell: owns filter state, passes filtered list to AuditTable. */
export function AuditPageShell({ events = [] }: AuditPageShellProps) {
  const [filters, setFilters] = React.useState<AuditFilters>(EMPTY_FILTERS);

  // Client-side filter (no API call yet — data is static/empty until endpoint is wired)
  const filtered = events.filter((ev) => {
    if (filters.actor && !ev.actor.toLowerCase().includes(filters.actor.toLowerCase())) return false;
    if (filters.eventType && !ev.event.toLowerCase().includes(filters.eventType.toLowerCase())) return false;
    if (filters.from && ev.at < filters.from) return false;
    if (filters.to && ev.at > filters.to + "T23:59:59Z") return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <AuditToolbar filters={filters} onChange={setFilters} />
      <AuditTable events={filtered} />
    </div>
  );
}
