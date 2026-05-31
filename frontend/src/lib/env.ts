/**
 * Server-side environment constants for BFF route handlers.
 * Import this instead of redeclaring process.env lookups in each route.
 */

export const CORE_API_URL =
  process.env.CORE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8000";

export const BFF_TRUSTED_ORIGINS: string[] = (process.env.BFF_TRUSTED_ORIGINS ?? "")
  .split(",")
  .flatMap((s) => {
    const trimmed = s.trim();
    return trimmed ? [trimmed] : [];
  });

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

const PROTECTED_ENV_VALUES = new Set(["production", "prod", "staging"]);

function envValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isProtectedAppEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    PROTECTED_ENV_VALUES.has(envValue(env.APP_ENV)) ||
    PROTECTED_ENV_VALUES.has(envValue(env.NEXT_PUBLIC_APP_ENV)) ||
    PROTECTED_ENV_VALUES.has(envValue(env.NODE_ENV))
  );
}

export type BffCsrfGuardMode = "enforce" | "dry-run";

function resolveBffCsrfGuardMode(env: NodeJS.ProcessEnv = process.env): BffCsrfGuardMode {
  if (env.BFF_CSRF_GUARD_MODE !== "dry-run") return "enforce";
  return isProtectedAppEnv(env) ? "enforce" : "dry-run";
}

export const BFF_CSRF_GUARD_MODE: BffCsrfGuardMode = resolveBffCsrfGuardMode();

export function parseBffTrustedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .flatMap((value) => {
      value = value.trim();
      if (!value) return [];
      const parsed = new URL(value);
      const normalized = value.replace(/\/$/, "");
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== normalized) {
        throw new Error("BFF_TRUSTED_ORIGINS entries must be absolute origins.");
      }
      return [normalized];
    });
}

export function isDevBypassAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProtectedAppEnv(env) && env.DEV_BYPASS_ENABLED === "true";
}

export function assertFrontendEnvConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (!isProtectedAppEnv(env)) return;

  let origins: string[];
  try {
    origins = parseBffTrustedOrigins(env.BFF_TRUSTED_ORIGINS);
  } catch {
    throw new Error("Protected frontend env requires valid absolute BFF_TRUSTED_ORIGINS.");
  }
  if (origins.length === 0) {
    throw new Error("Protected frontend env requires non-empty BFF_TRUSTED_ORIGINS.");
  }

  if (env.BFF_CSRF_GUARD_MODE === "dry-run") {
    throw new Error("BFF_CSRF_GUARD_MODE=dry-run is forbidden in protected frontend envs.");
  }

  if (env.DEV_BYPASS_ENABLED === "true" || (env.DEV_BYPASS_CREDENTIALS ?? "").trim()) {
    throw new Error("DEV_BYPASS_ENABLED and DEV_BYPASS_CREDENTIALS are forbidden in protected frontend envs.");
  }
}
