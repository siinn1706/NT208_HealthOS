"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  CirclePlus,
  Sunrise,
  Sun,
  Moon,
  Cookie,
} from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { formatTime } from "@/lib/format-utils";
import { consumeMealDiaryRefreshRequest } from "@/lib/meal-diary-refresh";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Meal } from "@/types/api";

const MEAL_TYPE_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
};

interface TodayMealsWidgetProps {
  meals: Meal[];
}

function MealCard({ meal, tm }: { meal: Meal; tm: ReturnType<typeof useTranslations> }) {
  const [expanded, setExpanded] = useState(false);
  const locale = useLocale();
  const hr = formatTime(meal.logged_at, locale);
  const nr = meal.nutrition_result;

  return (
    <div className="rounded-lg border border-border bg-background hover:border-primary/30 transition-colors">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-shrink-0 size-9 rounded-full bg-primary/10 flex items-center justify-center">
          <UtensilsCrossed className="size-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{meal.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{hr}</span>
            {meal.meal_type && (() => {
              const { [meal.meal_type ?? "snack"]: cfgLocal } = {
                breakfast: { icon: Sunrise, label: tm("mealTypes.breakfast"),  color: "text-orange-400" },
                lunch:     { icon: Sun,     label: tm("mealTypes.lunch"),      color: "text-yellow-400" },
                dinner:    { icon: Moon,    label: tm("mealTypes.dinner"),     color: "text-indigo-400" },
                snack:     { icon: Cookie,  label: tm("mealTypes.snack"),      color: "text-emerald-400" },
              } as Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }>;
              const Icon = cfgLocal?.icon;
              return (
                <Badge variant="secondary" className="inline-flex items-center gap-1 text-[10px] h-4 px-1.5">
                  {Icon && <Icon className={`size-2.5 ${cfgLocal.color}`} />}
                  {cfgLocal?.label ?? meal.meal_type}
                </Badge>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {nr && (
            <span className="text-sm font-bold tabular-nums text-foreground">
              {Math.round(nr.calories)}{" "}
              <span className="text-xs font-normal text-muted-foreground">kcal</span>
            </span>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Macros row */}
              {nr && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-[#41BCE6]/10 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">{tm("protein")}</p>
                      <p className="text-xs font-bold text-[#41BCE6] tabular-nums">
                        {nr.protein_g}g
                      </p>
                    </div>
                    <div className="rounded-md bg-[#E7DEA7]/20 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">{tm("carbs")}</p>
                      <p className="text-xs font-bold text-[#b5a97a] dark:text-[#E7DEA7] tabular-nums">
                        {nr.carbs_g}g
                      </p>
                    </div>
                    <div className="rounded-md bg-[#E3B79A]/20 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">{tm("fat")}</p>
                      <p className="text-xs font-bold text-[#c4825a] dark:text-[#E3B79A] tabular-nums">
                        {nr.fat_g}g
                      </p>
                    </div>
                  </div>

                  {(nr.saturates_g !== undefined || nr.sugar_g !== undefined || nr.salt_g !== undefined) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-rose-500/10 px-2 py-1.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{tm("saturates")}</p>
                        <p className="text-xs font-bold text-rose-500 tabular-nums">
                          {(nr.saturates_g ?? 0).toFixed(1)}g
                        </p>
                      </div>
                      <div className="rounded-md bg-fuchsia-500/10 px-2 py-1.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{tm("sugar")}</p>
                        <p className="text-xs font-bold text-fuchsia-500 tabular-nums">
                          {(nr.sugar_g ?? 0).toFixed(1)}g
                        </p>
                      </div>
                      <div className="rounded-md bg-sky-500/10 px-2 py-1.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{tm("salt")}</p>
                        <p className="text-xs font-bold text-sky-500 tabular-nums">
                          {(nr.salt_g ?? 0).toFixed(1)}g
                        </p>
                      </div>
                    </div>
                  )}

                  {(nr.dish_name || nr.source) && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {nr.dish_name && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                          {nr.dish_name}
                        </Badge>
                      )}
                      {nr.source && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase">
                          {nr.source}
                        </Badge>
                      )}
                    </div>
                  )}
                  {nr.serving_type && (
                    <p className="text-[10px] text-muted-foreground">
                      {tm("serving")}: {nr.serving_type}
                    </p>
                  )}
                </div>
              )}

              {/* Ingredients */}
              {meal.ingredients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {tm("ingredients")}
                  </p>
                  <ul className="space-y-1">
                    {meal.ingredients.map((ing) => (
                      <li
                        key={`${ing.ingredient_name}-${ing.grams}-${ing.calories}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-foreground/80 truncate">
                          {ing.ingredient_name}
                        </span>
                        <span className="text-muted-foreground tabular-nums flex-shrink-0 ml-2">
                          {ing.grams}g
                          {ing.calories > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              ({Math.round(ing.calories)} kcal)
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TodayMealsWidget({ meals }: TodayMealsWidgetProps) {
  const locale = useLocale();
  const tm = useTranslations("dashboard.meals");
  const router = useRouter();

  useEffect(() => {
    if (consumeMealDiaryRefreshRequest()) {
      router.refresh();
    }
  }, [router]);

  const sorted = meals.toSorted(
    (a, b) =>
      (MEAL_TYPE_ORDER[a.meal_type ?? "snack"] ?? 2) -
      (MEAL_TYPE_ORDER[b.meal_type ?? "snack"] ?? 2)
  );

  const totalCalories = meals.reduce(
    (sum, m) => sum + (m.nutrition_result?.calories ?? 0),
    0
  );

  return (
    <LazyMotion features={domAnimation}>
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{tm("today")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {meals.length > 0
              ? tm("mealsLogged", { count: meals.length, cal: Math.round(totalCalories) })
              : tm("noMealsLogged")}
          </p>
        </div>
        <Link
          href={`/dashboard/meals/add`}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            "text-primary hover:text-primary/80 transition-colors"
          )}
        >
          <CirclePlus className="size-4" />
          {tm("addMeal")}
        </Link>
      </div>

      {/* Meal list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <UtensilsCrossed className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {tm("noMealsToday")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tm("noMealsTodayMsg")}
            </p>
          </div>
          <Link
            href={`/dashboard/meals/add`}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "text-xs font-medium bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors"
            )}
          >
            <CirclePlus className="size-3.5" />
            {tm("addFirst")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((meal, i) => (
              <m.div
                key={meal.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <MealCard meal={meal} tm={tm} />
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
    </LazyMotion>
  );
}
