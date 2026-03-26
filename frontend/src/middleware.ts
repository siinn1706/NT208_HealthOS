import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const intlMiddleware = createMiddleware(routing);

/** Routes that require an active session cookie. */
const PROTECTED_PREFIXES = ["/dashboard"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

async function checkOnboardingStatus(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    // Call the session endpoint to get onboarding status
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const sessionRes = await fetch(`${baseUrl}/api/v1/auth/session`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!sessionRes.ok) return false;

    const sessionData = await sessionRes.json();
    const status = sessionData?.data?.onboarding_status;
    return status === "completed";
  } catch {
    return false;
  }
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const sessionRes = await fetch(`${baseUrl}/api/v1/auth/session`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });
    return sessionRes.ok;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Strip locale prefix for protection check (e.g. /vi/dashboard → /dashboard)
  const pathnameWithoutLocale = pathname.replace(/^\/(vi|en)/, "") || "/";

  // Onboarding protection: only accessible to authenticated users with incomplete onboarding
  if (pathnameWithoutLocale === "/onboarding" || pathnameWithoutLocale.startsWith("/onboarding/")) {
    const authenticated = await isAuthenticated(req);
    if (!authenticated) {
      // Not logged in → redirect to login
      const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in but onboarding already completed → redirect to dashboard
    const onboardingComplete = await checkOnboardingStatus(req);
    if (onboardingComplete) {
      const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? routing.defaultLocale;
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (isProtected(pathnameWithoutLocale)) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      // Redirect to the locale-prefixed login page
      const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check onboarding status
    const onboardingComplete = await checkOnboardingStatus(req);
    if (!onboardingComplete) {
      const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? routing.defaultLocale;
      const onboardingUrl = new URL(`/${locale}/onboarding`, req.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Match root and locale-prefixed routes
    "/",
    "/(vi|en)/:path*",
    // Skip Next.js internals, static files, and API routes
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};

