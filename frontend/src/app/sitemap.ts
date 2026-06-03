import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://healthos.vn";
const locales = ["vi", "en"] as const;

function localizedUrls(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"],
): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${BASE}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...localizedUrls("", 1.0, "weekly"),
    ...localizedUrls("/about", 0.8, "monthly"),
    ...localizedUrls("/services", 0.8, "monthly"),
    ...localizedUrls("/plans", 0.9, "monthly"),
    ...localizedUrls("/articles", 0.7, "weekly"),
  ];
}
