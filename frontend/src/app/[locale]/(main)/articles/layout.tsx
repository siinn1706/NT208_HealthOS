import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { articles } from "@/data/articles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("articles.meta");
  return {
    title: `${t("title")} — HealthOS`,
    description: t("description"),
    openGraph: {
      title: `${t("title")} — HealthOS`,
      description: t("description"),
      type: "website",
    },
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
      url: `https://healthos.vn/articles#${a.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD is serialized from article metadata, not user HTML.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      {children}
    </>
  );
}
