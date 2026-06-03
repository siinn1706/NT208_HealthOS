import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
  const locale = await getLocale();
  return {
    ...buildLocaleMetadata({
      locale,
      path: "/about",
      title: t("title"),
      description: t("description"),
    }),
    keywords: [
      "HealthOS", "NT208", "student project", "university course project",
      "health management app", "AI food recognition", "UIT Vietnam",
    ],
  };
}

// Organization JSON-LD is rendered by the parent (main)/layout.tsx — no duplicate here.
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
