import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { META_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { getLocaleFromPathname, stripLocalePrefix } from "@/lib/locale-path";

const intlMiddleware = createMiddleware(routing);

/** Routes that require an active session cookie. */
const PROTECTED_PREFIXES = ["/dashboard"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

/**
 * Read onboarding status from the httpOnly meta cookie set by BFF on login.
 * Avoids a round-trip fetch to /api/v1/auth/session on every proxy invocation.
 * The (app) layout still revalidates against Core BE for defence-in-depth.
 */
function getOnboardingStatus(req: NextRequest): string {
  const raw = req.cookies.get(META_COOKIE_NAME)?.value;
  if (!raw) return "pending";
  try {
    const meta = JSON.parse(raw) as Record<string, unknown>;
    return typeof meta.onboarding_status === "string"
      ? meta.onboarding_status
      : "pending";
  } catch {
    return "pending";
  }
}

export default function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const pathnameWithoutLocale = stripLocalePrefix(pathname);
  const locale = getLocaleFromPathname(pathname);

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  // ── Onboarding route protection ───────────────────────────────────────────
  if (
    pathnameWithoutLocale === "/onboarding" ||
    pathnameWithoutLocale.startsWith("/onboarding/")
  ) {
    if (!hasSession) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Already completed → skip onboarding
    if (getOnboardingStatus(req) === "completed") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  // ── Dashboard (and other protected) route protection ─────────────────────
  if (isProtected(pathnameWithoutLocale)) {
    if (!hasSession) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Onboarding incomplete → gate before dashboard
    if (getOnboardingStatus(req) !== "completed") {
      return NextResponse.redirect(new URL(`/${locale}/onboarding`, req.url));
    }
  }

  return intlMiddleware(req);
}

// Next.js requires every entry in `config.matcher` to be a statically-analyzable
// string literal (no variables, template expressions, or function calls — see
// https://nextjs.org/docs/app/api-reference/file-conventions/middleware#matcher).
// The locale alternation below MUST stay in sync with `routing.locales` in
// `src/i18n/routing.ts`. If you add or remove a locale, update both spots.
export const config = {
  matcher: [
    "/",
    "/(vi|en)/:path*",
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};
