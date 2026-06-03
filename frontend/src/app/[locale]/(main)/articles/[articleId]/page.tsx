import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { articles } from "@/data/articles";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";
import { Clock, Calendar } from "lucide-react";

interface ArticlePageParams {
  params: Promise<{ locale: string; articleId: string }>;
}

export function generateStaticParams() {
  return articles.map((a) => ({ articleId: a.id }));
}

export async function generateMetadata({
  params,
}: ArticlePageParams): Promise<Metadata> {
  const { locale, articleId } = await params;
  setRequestLocale(locale);

  const article = articles.find((a) => a.id === articleId);
  if (!article) return {};

  const l = locale as Locale;
  const title = pickLocale(article.title, l);
  const description = pickLocale(article.excerpt, l);

  return buildLocaleMetadata({
    locale,
    path: `/articles/${articleId}`,
    title: `${title} — HealthOS`,
    description,
    image: article.image,
  });
}

export default async function ArticlePage({ params }: ArticlePageParams) {
  const { locale, articleId } = await params;
  setRequestLocale(locale);

  const article = articles.find((a) => a.id === articleId);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "articles" });
  const l = locale as Locale;

  const title = pickLocale(article.title, l);
  const body = pickLocale(article.body, l);
  const excerpt = pickLocale(article.excerpt, l);

  const formattedDate = new Date(article.date).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    image: article.image,
    author: { "@type": "Person", name: article.author },
    datePublished: article.date,
    url: absoluteUrl(`/${locale}/articles/${articleId}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-8 space-y-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
            <Image
              src={article.image}
              alt={title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground">{excerpt}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold">{article.author}</span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden="true" />
              <time dateTime={article.date}>{formattedDate}</time>
            </span>
            {article.readingMinutes && (
              <>
                <span aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t("minRead", { n: article.readingMinutes })}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </main>
    </>
  );
}
