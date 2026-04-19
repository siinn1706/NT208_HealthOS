"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { getLocaleTag } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import { pickLocale } from "@/types";
import type { Article, Locale } from "@/types";
import { Clock, Calendar } from "lucide-react";
import { Link } from "@/navigation";

interface ArticleCardProps {
  article: Article;
  variant?: "featured" | "sidebar" | "list" | "rail";
  /** Resolved category label (already localised by the parent). */
  categoryLabel?: string;
}

export function ArticleCard({ article, variant = "list", categoryLabel = "" }: ArticleCardProps) {
  const locale = useLocale() as Locale;
  const tArticles = useTranslations("articles");
  const title = pickLocale(article.title, locale);
  const excerpt = pickLocale(article.excerpt, locale);

  const formattedDate = new Intl.DateTimeFormat(getLocaleTag(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(article.date));

  const minRead = article.readingMinutes
    ? tArticles("minRead", { n: article.readingMinutes })
    : null;

  if (variant === "featured") {
    return (
      <Link
        href={`/articles/${article.id}`}
        className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <article className="group relative overflow-hidden rounded-2xl border border-white/5">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={article.image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night-900/90 via-night-900/30 to-transparent" />
            {categoryLabel && (
              <Badge className="absolute bottom-20 left-4 border-0 bg-gradient-to-r from-night-700 to-night-400 text-white shadow-sm hover:brightness-110">
                {categoryLabel}
              </Badge>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="mb-2 text-lg font-bold text-white line-clamp-2">{title}</h3>
            <p className="mb-3 text-sm text-night-100/80 line-clamp-3">{excerpt}</p>
            <MetaRow tone="dark" author={article.author} date={formattedDate} minRead={minRead} />
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link
        href={`/articles/${article.id}`}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <article className="group flex gap-4 rounded-xl">
          <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src={article.image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="128px"
            />
            {categoryLabel && (
              <Badge className="absolute bottom-1 left-1 border-0 bg-gradient-to-r from-night-700/80 to-night-400/80 text-[10px] text-white hover:brightness-110">
                {categoryLabel}
              </Badge>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="mb-1 text-sm font-semibold text-white line-clamp-2 group-hover:text-night-300 transition-colors">
              {title}
            </h4>
            <p className="mb-2 text-xs text-night-100/80 line-clamp-2">{excerpt}</p>
            <MetaRow tone="dark" compact author={article.author} date={formattedDate} minRead={minRead} />
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "rail") {
    return (
      <Link
        href={`/articles/${article.id}`}
        className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:border-night-400/40 hover:shadow-md">
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={article.image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {categoryLabel && (
              <Badge className="absolute bottom-2 left-2 border-0 bg-gradient-to-r from-night-700 to-night-400 text-[10px] text-white hover:brightness-110">
                {categoryLabel}
              </Badge>
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <h4 className="mb-2 text-base font-semibold text-foreground line-clamp-2 group-hover:text-night-700 dark:group-hover:text-night-300">
              {title}
            </h4>
            <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
            <div className="mt-auto">
              <MetaRow author={article.author} date={formattedDate} minRead={minRead} />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      href={`/articles/${article.id}`}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article className="group flex gap-4 rounded-xl">
        <div className="relative h-28 w-40 flex-shrink-0 overflow-hidden rounded-lg">
          <Image
            src={article.image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="160px"
          />
          {categoryLabel && (
            <Badge className="absolute bottom-1 left-1 border-0 bg-gradient-to-r from-night-700 to-night-400 text-[10px] text-white hover:brightness-110">
              {categoryLabel}
            </Badge>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <h4 className="mb-1 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-night-700 dark:group-hover:text-night-300 transition-colors">
            {title}
          </h4>
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
          <MetaRow author={article.author} date={formattedDate} minRead={minRead} />
        </div>
      </article>
    </Link>
  );
}

interface MetaRowProps {
  author: string;
  date: string;
  minRead: string | null;
  tone?: "light" | "dark";
  compact?: boolean;
}

function MetaRow({ author, date, minRead, tone = "light", compact = false }: MetaRowProps) {
  const text =
    tone === "dark"
      ? compact
        ? "text-[10px] text-night-100/80"
        : "text-xs text-night-100/80"
      : compact
        ? "text-[10px] text-muted-foreground"
        : "text-xs text-muted-foreground";

  const chip = "inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 dark:bg-white/5";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${text}`}>
      <span className="font-semibold">{author}</span>
      <span aria-hidden="true">•</span>
      <span className={chip}>
        <Calendar className="h-3 w-3" aria-hidden="true" />
        {date}
      </span>
      {minRead && (
        <span className={chip}>
          <Clock className="h-3 w-3" aria-hidden="true" />
          {minRead}
        </span>
      )}
    </div>
  );
}
