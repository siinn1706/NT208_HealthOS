// oxlint-disable react-doctor/nextjs-missing-metadata -- Articles metadata is supplied by the route layout.
import { getTranslations, getLocale } from "next-intl/server";
import { MarketingArticlesBrowserIsland } from "@/components/shared/marketing-articles-browser-island";
import { articles, articleCategories } from "@/data/articles";
import type { Locale } from "@/types";

export default async function ArticlesPage() {
  const t = await getTranslations("articles");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="pt-16 md:pt-20">
      <MarketingArticlesBrowserIsland
        articles={articles}
        articleCategories={articleCategories}
        locale={locale}
        badge={t("badge")}
        featuredTitle={t("featuredTitle")}
        listingTitle={t("listingTitle")}
        relatedTitle={t("relatedTitle")}
        relatedSubtitle={t("relatedSubtitle")}
        searchPlaceholder={t("searchPlaceholder")}
        noResults={t("noResults")}
        loadMore={t("loadMore")}
      />
    </div>
  );
}
