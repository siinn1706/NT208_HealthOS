import type { Metadata } from "next";
import { absoluteUrl, localeAlternates } from "./site-url";

interface LocaleMetadataOpts {
  locale: string;
  /** Locale-neutral path, e.g. "/about" or "/articles/1". */
  path: string;
  title: string;
  description: string;
  image?: string;
}

/**
 * Build full Metadata for a public indexable page: absolute canonical,
 * fully-qualified hreflang trio, and matching OG/Twitter fields.
 */
export function buildLocaleMetadata(opts: LocaleMetadataOpts): Metadata {
  const { locale, path, title, description, image } = opts;
  const selfUrl = absoluteUrl(`/${locale}${path}`);
  const alts = localeAlternates(path);

  const ogImages = image ? [{ url: image }] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: selfUrl,
      languages: alts.languages,
    },
    openGraph: {
      title,
      description,
      url: selfUrl,
      type: "website",
      siteName: "HealthOS",
      ...(ogImages && { images: ogImages }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImages && { images: ogImages }),
    },
  };
}

interface NoindexMetadataOpts {
  locale: string;
  path: string;
  title: string;
  description: string;
}

/**
 * Build Metadata for noindex pages (auth, verify, etc.).
 * Intentionally omits alternates and openGraph.url — Google guidance
 * against contradictory canonical/hreflang signals on noindex pages.
 */
export function buildNoindexMetadata(opts: NoindexMetadataOpts): Metadata {
  const { title, description } = opts;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
