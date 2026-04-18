/**
 * Server-side environment constants for BFF route handlers.
 * Import this instead of redeclaring process.env lookups in each route.
 */

export const CORE_API_URL =
  process.env.CORE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8000";
