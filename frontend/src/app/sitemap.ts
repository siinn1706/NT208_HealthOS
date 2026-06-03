import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site-url";
import { routing } from "@/i18n/routing";
import { articles } from "@/data/articles";

export const revalidate = 300;

const PUBLIC_PATHS = [
  { path: "",               p: 1.0, freq: "weekly"  },
  { path: "/about",         p: 0.8, freq: "monthly" },
  { path: "/services",      p: 0.8, freq: "monthly" },
  { path: "/plans",         p: 0.9, freq: "monthly" },
  { path: "/articles",      p: 0.7, freq: "weekly"  },
  { path: "/legal/privacy", p: 0.3, freq: "yearly"  },
] as const;

function localizedUrls(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: absoluteUrl(`/${locale}${path}`),
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        vi: absoluteUrl(`/vi${path}`),
        en: absoluteUrl(`/en${path}`),
        "x-default": absoluteUrl(`/vi${path}`),
      },
    },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = PUBLIC_PATHS.flatMap(({ path, p, freq }) =>
    localizedUrls(path, p, freq),
  );

  const articleEntries = articles.flatMap((a) =>
    localizedUrls(`/articles/${a.id}`, 0.6, "monthly"),
  );

  return [...base, ...articleEntries];
}
