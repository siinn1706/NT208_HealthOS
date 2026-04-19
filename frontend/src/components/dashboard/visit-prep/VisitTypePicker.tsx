"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { VisitType } from "@/types/api";

const ALL_TYPES: VisitType[] = [
  "gp_routine",
  "specialist",
  "follow_up",
  "mental_health",
  "urgent_walkin",
  "pediatric_caregiver",
];

interface Props {
  value: VisitType;
  onChange: (next: VisitType) => void;
  disabled?: boolean;
}

export function VisitTypePicker({ value, onChange, disabled }: Props) {
  const t = useTranslations("dashboard.visitPrep.visitTypes");
  return (
    <div
      role="radiogroup"
      aria-label={t("gp_routine")}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {ALL_TYPES.map((type) => {
        const isActive = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted/40",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <p className="text-sm font-semibold text-foreground">{t(type)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(`${type}Help` as Parameters<typeof t>[0])}
            </p>
          </button>
        );
      })}
    </div>
  );
}
