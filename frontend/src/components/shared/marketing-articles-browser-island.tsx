"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StickyFilterBar, type FilterPill } from "@/components/shared/StickyFilterBar";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { pickLocale } from "@/types";
import type { Article, ArticleCategory, Locale } from "@/types";

const PAGE_SIZE = 9;

interface Props {
  articles: Article[];
  articleCategories: ArticleCategory[];
  locale: Locale;
  badge: string;
  featuredTitle: string;
  listingTitle: string;
  relatedTitle: string;
  relatedSubtitle: string;
  searchPlaceholder: string;
  noResults: string;
  loadMore: string;
}

export function MarketingArticlesBrowserIsland({
  articles,
  articleCategories,
  locale,
  badge,
  featuredTitle,
  listingTitle,
  relatedTitle,
  relatedSubtitle,
  searchPlaceholder,
  noResults,
  loadMore,
}: Props) {
  const t = useTranslations("articles");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      const inCategory = activeCategory === "all" || a.categoryId === activeCategory;
      if (!inCategory) return false;
      if (!q) return true;
      const haystack = [
        pickLocale(a.title, locale),
        pickLocale(a.excerpt, locale),
        a.author,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeCategory, search, locale, articles]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  function getCategoryLabel(categoryId: string) {
    const cat = articleCategories.find((c) => c.id === categoryId);
    return cat ? pickLocale(cat.label, locale) : "";
  }

  const [featured, ...sidebar] = filtered;

  const pills: FilterPill[] = articleCategories.map((cat) => ({
    id: cat.id,
    label: pickLocale(cat.label, locale),
    count:
      cat.id === "all"
        ? articles.length
        : articles.filter((a) => a.categoryId === cat.id).length,
  }));

  const lastVisible = visible[visible.length - 1];
  const related = lastVisible
    ? articles
        .filter((a) => a.id !== lastVisible.id && a.categoryId === lastVisible.categoryId)
        .slice(0, 3)
    : [];

  return (
    <>
      {/* ── FEATURED HERO ────────────────────────────────────── */}
      {featured && (
        <Section tone="dark" padding="md" contained={false} aria-labelledby="articles-featured-title">
          <AtmosphereGrid variant="dots" tone="dark" interactive />
          <AtmosphereGlow variant="soft" static />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Badge className="mb-3 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:brightness-105">
                {badge}
              </Badge>
              <h1 id="articles-featured-title" className="text-3xl font-extrabold text-white sm:text-4xl">
                {featuredTitle}
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ArticleCard
                  article={featured}
                  variant="featured"
                  categoryLabel={getCategoryLabel(featured.categoryId)}
                />
              </div>
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
        </Section>
      )}

      {/* ── STICKY SEARCH + CATEGORY ─────────────────────────── */}
      <StickyFilterBar
        pills={pills}
        activePillId={activeCategory}
        onPillChange={(id) => {
          setActiveCategory(id);
          setPage(1);
        }}
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            setPage(1);
          },
          placeholder: searchPlaceholder,
          ariaLabel: searchPlaceholder,
        }}
        resultSummary={t("resultCount", { count: filtered.length })}
      />

      {/* ── ARTICLE LIST ─────────────────────────────────────── */}
      <Section tone="default" padding="md" aria-labelledby="articles-listing-title">
        <h2 id="articles-listing-title" className="sr-only">{listingTitle}</h2>
        {filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">{noResults}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-5">
              {visible.map((article) => (
                <li key={article.id}>
                  <ArticleCard
                    article={article}
                    variant="list"
                    categoryLabel={getCategoryLabel(article.categoryId)}
                  />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-10 text-center">
                <Button
                  variant="outline"
                  className="rounded-full border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => setPage((p) => p + 1)}
                >
                  {loadMore}
                </Button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── RELATED RAIL ─────────────────────────────────────── */}
      {related.length > 0 && (
        <Section tone="muted" padding="md" overflow="visible" aria-labelledby="articles-related-title">
          <SectionHeader
            id="articles-related-title"
            eyebrow={badge}
            title={relatedTitle}
            subtitle={relatedSubtitle}
            align="left"
          />
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((article) => (
              <li key={article.id}>
                <ArticleCard
                  article={article}
                  variant="rail"
                  categoryLabel={getCategoryLabel(article.categoryId)}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
