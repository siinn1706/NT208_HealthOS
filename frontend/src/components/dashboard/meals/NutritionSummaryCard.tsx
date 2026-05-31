"use client";

import { useMemo } from "react";
import { useWatch, useFormContext } from "react-hook-form";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { Beef, Wheat, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { findIngredient, calcNutrition } from "@/data/ingredients";
import type { AddMealFormValues } from "@/lib/validators/meal-schema";

const DAILY_TARGETS = {
  calories: 2000,
  protein_g: 80,
  carbs_g: 250,
  fat_g: 65,
};

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  colorClass: string;
  icon: React.ReactNode;
}

function MacroBar({ label, value, target, unit, colorClass, icon }: MacroBarProps) {
  const pct = Math.min((value / target) * 100, 100);
  const over = value > target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-foreground/80", colorClass)}>{icon}</span>
          <span className="text-xs font-medium text-foreground/80">{label}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <AnimatePresence mode="popLayout">
            <m.span
              key={Math.round(value)}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "text-xs font-bold tabular-nums",
                over ? "text-amber-500" : "text-foreground"
              )}
            >
              {Math.round(value)}
            </m.span>
          </AnimatePresence>
          <span className="text-xs text-muted-foreground">
            / {target} {unit}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <m.div
          className={cn("h-full rounded-full", colorClass, over && "opacity-70")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ backgroundColor: "currentColor" }}
        />
      </div>
    </div>
  );
}

export function NutritionSummaryCard() {
  const { control } = useFormContext<AddMealFormValues>();
  const ingredients = useWatch({ control, name: "ingredients" });
  const tm = useTranslations("dashboard.meals");

  const totals = useMemo(() => {
    if (!ingredients || ingredients.length === 0) {
      return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    }

    return ingredients.reduce(
      (acc, ing) => {
        if (!ing.ingredient_name || !ing.grams || ing.grams <= 0) return acc;

        const dbItem = findIngredient(ing.ingredient_name);
        const hasAiMacros =
          ing.protein_g !== undefined ||
          ing.carbs_g !== undefined ||
          ing.fat_g !== undefined;

        if (dbItem && ing.is_matched !== false && !hasAiMacros) {
          const calc = calcNutrition(dbItem, ing.grams);
          acc.calories += calc.calories;
          acc.protein_g += calc.protein_g;
          acc.carbs_g += calc.carbs_g;
          acc.fat_g += calc.fat_g;
        } else if (ing.manual_calories && ing.manual_calories > 0) {
          acc.calories += ing.manual_calories;
          acc.carbs_g += ing.carbs_g ?? ing.manual_calories * 0.5 / 4;
          acc.protein_g += ing.protein_g ?? ing.manual_calories * 0.15 / 4;
          acc.fat_g += ing.fat_g ?? ing.manual_calories * 0.35 / 9;
        }
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [ingredients]);

  const roundedTotals = {
    calories: Math.round(totals.calories * 10) / 10,
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
  };

  const calPct = Math.min(
    (roundedTotals.calories / DAILY_TARGETS.calories) * 100,
    100
  );

  return (
    <LazyMotion features={domAnimation}>
      <div className="rounded-xl border border-border bg-card p-5 space-y-5 sticky top-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tổng dinh dưỡng</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tính theo thành phần đã nhập
        </p>
      </div>

      {/* Big calorie ring */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative flex items-center justify-center">
          <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
        <m.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 42 * (1 - calPct / 100),
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="popLayout">
              <m.span
                key={Math.round(roundedTotals.calories)}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-bold tabular-nums text-foreground leading-none"
              >
                {Math.round(roundedTotals.calories)}
              </m.span>
            </AnimatePresence>
            <span className="text-xs text-muted-foreground mt-0.5">kcal</span>
            <span className="text-[10px] text-muted-foreground">
              / {DAILY_TARGETS.calories}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {roundedTotals.calories > 0
            ? tm("dailyTarget", { pct: Math.round(calPct) })
            : "Chưa có thành phần nào"}
        </p>
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        <MacroBar
          label="Protein"
          value={roundedTotals.protein_g}
          target={DAILY_TARGETS.protein_g}
          unit="g"
          colorClass="text-[#41BCE6]"
          icon={<Beef className="size-3.5" />}
        />
        <MacroBar
          label="Carbs"
          value={roundedTotals.carbs_g}
          target={DAILY_TARGETS.carbs_g}
          unit="g"
          colorClass="text-[#E7DEA7]"
          icon={<Wheat className="size-3.5" />}
        />
        <MacroBar
          label="Chất béo"
          value={roundedTotals.fat_g}
          target={DAILY_TARGETS.fat_g}
          unit="g"
          colorClass="text-[#E3B79A]"
          icon={<Droplets className="size-3.5" />}
        />
      </div>

      {/* Calorie breakdown note */}
      {roundedTotals.calories > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Phân bổ năng lượng
          </p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {roundedTotals.calories > 0 && (
              <>
                <m.div
                  className="bg-[#41BCE6] h-full"
                  animate={{
                    width: `${Math.min(((roundedTotals.protein_g * 4) / roundedTotals.calories) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <m.div
                  className="bg-[#E7DEA7] h-full"
                  animate={{
                    width: `${Math.min(((roundedTotals.carbs_g * 4) / roundedTotals.calories) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <m.div
                  className="bg-[#E3B79A] h-full flex-1"
                  transition={{ duration: 0.3 }}
                />
              </>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[#41BCE6]" />
              P {Math.round((roundedTotals.protein_g * 4 / Math.max(roundedTotals.calories, 1)) * 100)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[#E7DEA7]" />
              C {Math.round((roundedTotals.carbs_g * 4 / Math.max(roundedTotals.calories, 1)) * 100)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[#E3B79A]" />
              F {Math.round((roundedTotals.fat_g * 9 / Math.max(roundedTotals.calories, 1)) * 100)}%
            </span>
          </div>
        </div>
      )}
      </div>
    </LazyMotion>
  );
}
