/**
 * Route protection classification fixture.
 *
 * Authoritative list of every page in the app/[locale] tree, classified as
 * private (requires session) or public (no session needed).
 *
 * The regression test globs page.tsx files at test time and asserts every
 * discovered route is listed here. An unclassified page FAILS the test.
 *
 * When adding a new page:
 *   - Under /dashboard → add to PRIVATE_PATHS (it inherits the /dashboard prefix protection).
 *   - Not under /dashboard or /onboarding → decide public/private, add here, and
 *     if private also add its prefix to PROTECTED_PREFIXES in proxy.ts.
 *
 * Paths are locale-stripped (no /vi or /en prefix). Dynamic segments use the
 * Next.js file-system bracket notation (e.g. [id], [token]).
 */

export const PRIVATE_PATHS = [
  "/dashboard",
  "/dashboard/achievements",
  "/dashboard/appointments",
  "/dashboard/chat",
  "/dashboard/chat/[conversationId]",
  "/dashboard/emergency-card",
  "/dashboard/health",
  "/dashboard/health/add",
  "/dashboard/leaderboard",
  "/dashboard/meals",
  "/dashboard/meals/add",
  "/dashboard/meals/snap",
  "/dashboard/medications",
  "/dashboard/medications/[id]",
  "/dashboard/notifications",
  "/dashboard/profile",
  "/dashboard/progress",
  "/dashboard/reminders",
  "/dashboard/reports",
  "/dashboard/reports/[category]",
  "/dashboard/reports/trends",
  "/dashboard/risk",
  "/dashboard/settings",
  "/dashboard/settings/devices",
  "/dashboard/visit-prep",
  "/dashboard/visit-prep/[id]",
  "/dashboard/visit-prep/[id]/print",
  "/dashboard/visit-prep/new",
  "/onboarding",
] as const;

export const PUBLIC_PATHS = [
  "/",
  "/about",
  "/articles",
  "/dev/kitchensink",
  "/e/[token]",
  "/forgot-password",
  "/legal/health-data",
  "/legal/privacy",
  "/login",
  "/plans",
  "/register",
  "/services",
  "/verify",
] as const;

export type PrivatePath = (typeof PRIVATE_PATHS)[number];
export type PublicPath = (typeof PUBLIC_PATHS)[number];
