"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { confidenceTierFor, type ConfidenceTier } from "@/types/data-slice";

interface ConfidenceChipProps {
  /** AI / model confidence in [0, 1]. */
  value?: number | null;
  /** Override the computed tier — useful for tests / storybook. */
  tier?: ConfidenceTier;
  className?: string;
  /** Show the underlying numeric value (e.g. "72%"). */
  showValue?: boolean;
}

const TIER_THEME: Record<
  ConfidenceTier,
  { text: string; bg: string; ring: string; Icon: React.ElementType }
> = {
  high:    { text: "text-success",          bg: "bg-success/10",     ring: "ring-success/20",          Icon: ShieldCheck },
  medium:  { text: "text-warning",          bg: "bg-warning/10",     ring: "ring-warning/20",          Icon: ShieldAlert },
  low:     { text: "text-destructive",      bg: "bg-destructive/10", ring: "ring-destructive/20",      Icon: ShieldAlert },
  unknown: { text: "text-muted-foreground", bg: "bg-muted",          ring: "ring-muted-foreground/20", Icon: ShieldQuestion },
};

/**
 * Three-tier confidence indicator used wherever AI / model output is shown
 * (meals analysis, AI report insights, derived predictions). Tiers per UX
 * plan section I:
 *   high   >= 0.80   (green)
 *   medium >= 0.60   (amber, recommend review)
 *   low    <  0.60   (red, mandatory review)
 */
export function ConfidenceChip({
  value,
  tier: tierOverride,
  className,
  showValue = false,
}: ConfidenceChipProps) {
  const t = useTranslations("primitives.confidence");
  const tier = tierOverride ?? confidenceTierFor(value);
  const theme = TIER_THEME[tier];
  const Icon = theme.Icon;
  const label = t(tier as Parameters<typeof t>[0]);
  const numericLabel =
    showValue && typeof value === "number" && !Number.isNaN(value)
      ? `${Math.round(value * 100)}%`
      : null;

  return (
    <span
      data-slot="confidence-chip"
      data-tier={tier}
      title={t("ariaPrefix") + " " + label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ring-1",
        theme.text,
        theme.bg,
        theme.ring,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      <Sparkles className="size-2.5 -ml-0.5 opacity-70" aria-hidden />
      <span className="truncate">{label}</span>
      {numericLabel && <span className="opacity-70">· {numericLabel}</span>}
    </span>
  );
}
