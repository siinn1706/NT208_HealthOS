"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PlanCard } from "@/components/shared/PlanCard";
import { StickyFilterBar, type FilterPill } from "@/components/shared/StickyFilterBar";
import { Section } from "@/components/shared/Section";
import { pickLocale } from "@/types";
import type { Plan, Locale } from "@/types";

interface PlanCategoryItem {
  id: string;
  label: { vi: string; en: string };
}

interface Props {
  plans: Plan[];
  planCategories: PlanCategoryItem[];
  locale: Locale;
  title: string;
}

export function MarketingPlansFilterIsland({ plans, planCategories, locale, title }: Props) {
  const t = useTranslations("plans");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plans.filter((plan) => {
      const matchCat = activeCategory === "all" || plan.categoryId === activeCategory;
      const nameText = pickLocale(plan.name, locale).toLowerCase();
      const descText = pickLocale(plan.description, locale).toLowerCase();
      return matchCat && (!q || nameText.includes(q) || descText.includes(q));
    });
  }, [activeCategory, search, locale, plans]);

  const pills: FilterPill[] = planCategories.map((cat) => ({
    id: cat.id,
    label: pickLocale(cat.label, locale),
    count:
      cat.id === "all"
        ? plans.length
        : plans.filter((p) => p.categoryId === cat.id).length,
  }));

  return (
    <>
      <StickyFilterBar
        pills={pills}
        activePillId={activeCategory}
        onPillChange={setActiveCategory}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("searchPlaceholder"),
          ariaLabel: t("searchPlaceholder"),
        }}
        resultSummary={t("resultCount", { count: filtered.length })}
      />

      <Section tone="default" padding="md" aria-label={title}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-muted-foreground">{t("noResults")}</p>
            {(activeCategory !== "all" || search.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSearch("");
                }}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-night-700 transition-colors hover:border-night-400 hover:text-night-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 dark:text-night-300"
              >
                {t("clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
