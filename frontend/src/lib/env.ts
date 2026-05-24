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
