import { absoluteUrl } from "./site-url";

/**
 * Serialize JSON-LD for dangerouslySetInnerHTML.
 * Escapes </script>, U+2028, and U+2029 to prevent XSS if user-controlled
 * content ever reaches a JSON-LD block (e.g. via CMS).
 */
export function jsonLdScript(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HealthOS",
  url: absoluteUrl("/"),
  logo: absoluteUrl("/logo.svg"),
  description: "Academic health management project — NT208 course, UIT Vietnam",
  sameAs: [],
} as const;

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HealthOS",
  url: absoluteUrl("/"),
} as const;