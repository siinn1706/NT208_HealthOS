import { routing } from "@/i18n/routing";

let _cachedSiteUrl: string | null = null;

/** Returns the canonical origin. Reads NEXT_PUBLIC_APP_URL lazily so tests can stub env. */
export function getSiteUrl(): string {
  if (_cachedSiteUrl !== null) return _cachedSiteUrl;
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://healthos.page";
  _cachedSiteUrl = raw.replace(/\/+$/, "");
  return _cachedSiteUrl;
}

/** Reset the memoised value — test-only. */
export function _resetSiteUrlCache(): void {
  _cachedSiteUrl = null;
}

/**
 * Build an absolute URL from a locale-prefixed or plain path.
 * absoluteUrl("/vi/about") → "https://healthos.page/vi/about"
 * absoluteUrl("/") → "https://healthos.page"
 */
export function absoluteUrl(path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const site = getSiteUrl();
  return p === "/" ? site : `${site}${p}`;
}

/**
 * Build locale-paired alternates for a locale-neutral path like "/about".
 * Returns { canonical, languages } ready to spread into Next Metadata.alternates.
 * Canonical points at the defaultLocale variant.
 */
export function localeAlternates(localePath: string): {
  canonical: string;
  languages: Record<"vi" | "en" | "x-default", string>;
} {
  const defaultLocale = routing.defaultLocale as "vi" | "en";
  return {
    canonical: absoluteUrl(`/${defaultLocale}${localePath}`),
    languages: {
      vi: absoluteUrl(`/vi${localePath}`),
      en: absoluteUrl(`/en${localePath}`),
      "x-default": absoluteUrl(`/${defaultLocale}${localePath}`),
    },
  };
}
