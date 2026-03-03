"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Plus, Pill, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickMealSheet } from "@/components/dashboard/meals/QuickMealSheet";

interface QuickAction {
  key: "logMeal" | "scanMeal" | "addVital" | "logMedicine";
  icon: React.ElementType;
  color: string;
  bg: string;
}

const ACTIONS: QuickAction[] = [
  {
    key: "logMeal",
    icon: UtensilsCrossed,
    color: "text-[#41BCE6]",
    bg: "bg-[#41BCE6]/10 hover:bg-[#41BCE6]/20",
  },
  {
    key: "scanMeal",
    icon: Camera,
    color: "text-[#6DE7F7]",
    bg: "bg-[#6DE7F7]/10 hover:bg-[#6DE7F7]/20",
  },
  {
    key: "addVital",
    icon: Plus,
    color: "text-[#E8BDB7]",
    bg: "bg-[#E8BDB7]/10 hover:bg-[#E8BDB7]/20",
  },
  {
    key: "logMedicine",
    icon: Pill,
    color: "text-[#E7DEA7]",
    bg: "bg-[#E7DEA7]/10 hover:bg-[#E7DEA7]/20",
  },
];

export function QuickActionsWidget() {
  const t = useTranslations("dashboard.quickActions");
  const [mealSheetOpen, setMealSheetOpen] = useState(false);

  function handleAction(key: QuickAction["key"]) {
    if (key === "logMeal") {
      setMealSheetOpen(true);
    }
    // TODO: handlers for other actions
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">{t("title")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACTIONS.map(({ key, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => handleAction(key)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-lg p-4",
                "border border-border transition-colors duration-200 cursor-pointer",
                bg
              )}
              aria-label={t(key)}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  bg.split(" ")[0]
                )}
              >
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {t(key)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t(`${key}Desc` as Parameters<typeof t>[0])}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <QuickMealSheet open={mealSheetOpen} onOpenChange={setMealSheetOpen} />
    </>
  );
}
