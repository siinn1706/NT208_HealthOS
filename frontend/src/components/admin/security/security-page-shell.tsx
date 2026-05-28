// security-page-shell.tsx — layout shell for the security feed page
// Renders KPI strip + event feed with placeholder data until endpoint is wired.

import { SecurityKpiStrip } from "./security-kpi-strip";
import { SecurityEventFeed, type SecurityEvent } from "./security-event-feed";

interface SecurityPageShellProps {
  events?: SecurityEvent[];
}

/** Composes KPI strip + event feed. Both render their empty/placeholder states gracefully. */
export function SecurityPageShell({ events = [] }: SecurityPageShellProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI strip — null data shows em-dash placeholders */}
      <SecurityKpiStrip data={null} />

      {/* Event feed — empty array shows polished empty state */}
      <SecurityEventFeed events={events} />
    </div>
  );
}
