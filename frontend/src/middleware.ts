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

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Strip locale prefix for protection check (e.g. /vi/dashboard → /dashboard)
  const pathnameWithoutLocale = pathname.replace(/^\/(vi|en)/, "") || "/";

  if (isProtected(pathnameWithoutLocale)) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      // Redirect to the locale-prefixed login page
      const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? "vi";
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
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

