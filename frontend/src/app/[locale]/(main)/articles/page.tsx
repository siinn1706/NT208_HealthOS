"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { articles, articleCategories } from "@/data/articles";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";

const PAGE_SIZE = 6;

export default function ArticlesPage() {
  const t = useTranslations("articles");
  const locale = useLocale() as Locale;

  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return activeCategory === "all"
      ? articles
      : articles.filter((a) => a.categoryId === activeCategory);
  }, [activeCategory]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  function getCategoryLabel(categoryId: string) {
    const cat = articleCategories.find((c) => c.id === categoryId);
    return cat ? pickLocale(cat.label, locale) : "";
  }

  const [featured, ...sidebar] = filtered;

  return (
    <div className="pt-16 md:pt-20">

      {/* ── FEATURED HERO ────────────────────────────────────── */}
      {featured && (
        <section className="relative overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-night-900 py-16">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-night-400/15 blur-[100px]" />
          <div className="absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-warm-rose/10 blur-[80px]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <div className="mb-8">
              <Badge className="mb-3 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:brightness-105">
                {t("badge")}
              </Badge>
              <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                {t("featuredTitle")}
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Featured */}
              <div className="lg:col-span-2">
                <ArticleCard
                  article={featured}
                  variant="featured"
                  categoryLabel={getCategoryLabel(featured.categoryId)}
                />
              </div>
              {/* Sidebar */}
              <div className="flex flex-col gap-4 lg:pt-0">
                {sidebar.slice(0, 3).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="sidebar"
                    categoryLabel={getCategoryLabel(article.categoryId)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORY FILTER ──────────────────────────────────── */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/95 py-4 backdrop-blur-md md:top-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {articleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setPage(1); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-white"
                    : "border border-border bg-transparent text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {pickLocale(cat.label, locale)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTICLE GRID ─────────────────────────────────────── */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">{t("noResults")}</p>
          ) : (
            <>
              <div className="flex flex-col gap-5">
                {visible.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="list"
                    categoryLabel={getCategoryLabel(article.categoryId)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 text-center">
                  <Button
                    variant="outline"
                    className="rounded-full border-primary text-primary hover:bg-primary hover:text-white"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

    </div>
  );
}
