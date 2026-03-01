"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlanCard } from "@/components/shared/PlanCard";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { plans, planCategories } from "@/data/plans";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";

export default function PlansPage() {
  const t = useTranslations("plans");
  const locale = useLocale() as Locale;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      const matchCat = activeCategory === "all" || plan.categoryId === activeCategory;
      const nameText = pickLocale(plan.name, locale).toLowerCase();
      const descText = pickLocale(plan.description, locale).toLowerCase();
      const q = search.toLowerCase();
      const matchSearch = !q || nameText.includes(q) || descText.includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search, locale]);

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-night-900 py-20">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-night-400/15 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-warm-gold/10 blur-[80px]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Text column */}
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-night-700/80 to-night-400/80 text-white font-bold shadow-sm hover:brightness-110">
                {t("badge")}
              </Badge>
              <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
              <p className="text-lg text-night-100/70">{t("subtitle")}</p>
            </div>
            {/* Robot Checklist — priority since this is the page hero */}
            <div className="flex items-center justify-center">
              <AnimatedIllustration
                src="/illustrations/robot_checklist_write.svg"
                alt=""
                width={340}
                height={340}
                priority
                floatVariant="delayed"
                className="drop-shadow-[0_20px_60px_rgba(231,222,167,0.15)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTERS ──────────────────────────────────────────── */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/95 py-4 backdrop-blur-md md:top-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {planCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-gradient-to-r from-night-700 to-night-400 text-white shadow-md shadow-night-400/20"
                      : "border border-border bg-transparent text-muted-foreground hover:border-night-400 hover:text-night-600 dark:hover:text-night-300"
                  }`}
                >
                  {pickLocale(cat.label, locale)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── PLAN GRID ────────────────────────────────────────── */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">{t("noResults")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
