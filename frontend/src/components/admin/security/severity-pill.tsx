// severity-pill.tsx — severity level badge using admin status tokens

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string }> = {
  low:      { bg: "bg-[var(--admin-status-info-soft)]",    text: "text-[var(--admin-status-info)]"    },
  medium:   { bg: "bg-[var(--admin-status-warning-soft)]", text: "text-[var(--admin-status-warning)]" },
  high:     { bg: "bg-[var(--admin-status-danger-soft)]",  text: "text-[var(--admin-status-danger)]"  },
  critical: { bg: "bg-[var(--admin-status-danger-soft)]",  text: "text-[var(--admin-status-danger)] font-bold" },
};

interface SeverityPillProps {
  severity: string;
}

/** Severity badge using admin-status tokens — works in both light and dark mode. */
export function SeverityPill({ severity }: SeverityPillProps) {
  const cfg = SEVERITY_STYLES[severity as Severity] ?? {
    bg: "bg-[var(--admin-surface-muted)]",
    text: "text-[var(--admin-fg-muted)]",
  };
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      {label}
    </span>
  );
}
