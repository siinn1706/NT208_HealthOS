"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { pickLocale } from "@/types";
import type { Article, Locale } from "@/types";

interface ArticleCardProps {
  article: Article;
  variant?: "featured" | "sidebar" | "list";
  /** Resolved category label (already localised by the parent). */
  categoryLabel?: string;
}

export function ArticleCard({ article, variant = "list", categoryLabel = "" }: ArticleCardProps) {
  const locale = useLocale() as Locale;
  const title = pickLocale(article.title, locale);
  const excerpt = pickLocale(article.excerpt, locale);

  // Format ISO date per locale
  const formattedDate = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(article.date));

  if (variant === "featured") {
    return (
      <div className="group relative overflow-hidden rounded-2xl">
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
          <p className="mb-3 text-sm text-night-100/70 line-clamp-3">{excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-night-100/60">
            <span className="font-semibold text-night-100/80">{article.author}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="group flex gap-4">
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
          <p className="mb-2 text-xs text-night-100/60 line-clamp-2">{excerpt}</p>
          <div className="flex items-center gap-1 text-[10px] text-night-100/50">
            <span className="font-semibold">{article.author}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    );
  }

  // variant === "list"
  return (
    <div className="group flex gap-4 rounded-xl">
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
        <h4 className="mb-1 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-night-400 transition-colors">
          {title}
        </h4>
        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="font-semibold">{article.author}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
