// security-kpi-strip.tsx — 4 KPI mini-cards for the security feed page

export interface SecurityKpiData {
  failedLogins24h: number;
  lockedAccounts: number;
  suspiciousSessions: number;
  blockedIps: number;
}

interface SecurityKpiStripProps {
  /** Pass `null` to render placeholder dashes while data is unavailable. */
  data: SecurityKpiData | null;
}

const KPI_CONFIGS: Array<{ key: keyof SecurityKpiData; label: string; dangerWhen: (n: number) => boolean }> = [
  { key: "failedLogins24h",    label: "Failed Logins (24h)",  dangerWhen: (n) => n > 0  },
  { key: "lockedAccounts",     label: "Locked Accounts",      dangerWhen: (n) => n > 0  },
  { key: "suspiciousSessions", label: "Suspicious Sessions",  dangerWhen: (n) => n > 0  },
  { key: "blockedIps",         label: "Blocked IPs",          dangerWhen: () => false   },
];

/** 4 KPI cards for the security page header strip. */
export function SecurityKpiStrip({ data }: SecurityKpiStripProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="Security metrics"
    >
      {KPI_CONFIGS.map(({ key, label, dangerWhen }) => {
        const value = data?.[key];
        const isDanger = value !== undefined && dangerWhen(value);
        return (
          <div
            key={key}
            className="flex flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
              {label}
            </span>
            <span
              className={[
                "admin-tabular text-2xl font-semibold",
                isDanger
                  ? "text-[var(--admin-status-danger)]"
                  : "text-[var(--admin-fg)]",
              ].join(" ")}
              aria-label={`${label}: ${value ?? "unavailable"}`}
            >
              {value !== undefined ? value.toLocaleString() : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
