import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { articles } from "@/data/articles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("articles.meta");
  const locale = await getLocale();
  return {
    ...buildLocaleMetadata({
      locale,
      path: "/articles",
      title: t("title"),
      description: t("description"),
    }),
    keywords: [
      "HealthOS", "health articles", "nutrition", "BMI", "fitness",
      "AI food recognition", "NT208", "healthy living Vietnam",
    ],
  };
}

export default async function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: articles.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.title.en,
      url: absoluteUrl(`/en/articles/${a.id}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }}
      />
      {children}
    </>
  );
}
