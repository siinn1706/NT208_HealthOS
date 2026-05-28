import { APP_ENV } from "@/lib/env";

/** Small pill shown in the sidebar brand area when not in production. */
export function AdminEnvBadge() {
  if (APP_ENV === "prod") return null;

  const label = APP_ENV === "staging" ? "Staging" : "Dev";
  const colors =
    APP_ENV === "staging"
      ? "bg-[var(--admin-status-warning-soft)] text-[var(--admin-status-warning)]"
      : "bg-[var(--admin-status-info-soft)] text-[var(--admin-status-info)]";

  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${colors}`}
      aria-label={`Environment: ${label}`}
    >
      {label}
    </span>
  );
}
