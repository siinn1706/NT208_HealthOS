/**
 * Locale segment from URL path (next-intl routing). Shared by middleware and OAuth BFF callbacks.
 */
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

export const LOCALE_PREFIX_RE = new RegExp(`^/(${routing.locales.join("|")})`);

export function getLocaleFromPathname(pathname: string): string {
  return LOCALE_PREFIX_RE.exec(pathname)?.[1] ?? routing.defaultLocale;
}

export function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, "") || "/";
}

export function getLocaleFromReferer(request: NextRequest): string {
  const referer = request.headers.get("referer") ?? "";
  try {
    const url = new URL(referer);
    return getLocaleFromPathname(url.pathname);
  } catch {
    return routing.defaultLocale;
  }
}
