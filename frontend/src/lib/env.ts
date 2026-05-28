/**
 * Server-side environment constants for BFF route handlers.
 * Import this instead of redeclaring process.env lookups in each route.
 */

export const CORE_API_URL =
  process.env.CORE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8000";

export const BFF_TRUSTED_ORIGINS: string[] = (process.env.BFF_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export type BffCsrfGuardMode = "enforce" | "dry-run";
export const BFF_CSRF_GUARD_MODE: BffCsrfGuardMode =
  process.env.BFF_CSRF_GUARD_MODE === "dry-run" ? "dry-run" : "enforce";

/**
 * Feature flag: enable the /admin/security page and its sidebar entry.
 * Set ADMIN_SECURITY_FEED_ENABLED=true in the environment to activate.
 * Consumed by AdminSidebar and the security page module.
 */
export const ADMIN_SECURITY_FEED_ENABLED: boolean =
  process.env.ADMIN_SECURITY_FEED_ENABLED === "true";

/**
 * Feature flag: enable the /admin/audit page and its sidebar entry.
 * Set ADMIN_AUDIT_FEED_ENABLED=true in the environment to activate.
 * Consumed by AdminSidebar and the audit page module.
 */
export const ADMIN_AUDIT_FEED_ENABLED: boolean =
  process.env.ADMIN_AUDIT_FEED_ENABLED === "true";

/**
 * Deployment environment identifier.
 * Values: "dev" | "staging" | "prod". Defaults to "dev".
 * Consumed by AdminEnvBadge — hidden in prod.
 */
export const APP_ENV: "dev" | "staging" | "prod" =
  (process.env.NEXT_PUBLIC_APP_ENV as "dev" | "staging" | "prod") ?? "dev";
