"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Smartphone, Watch, Activity, HeartPulse, Hand, Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/data-slice";

interface ProviderTheme {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
}

const PROVIDER_THEMES: Record<ProviderId, ProviderTheme> = {
  apple_health:    { label: "Apple Health",   color: "#FF2D55", bg: "bg-[#FF2D55]/10", Icon: HeartPulse },
  google_fit:      { label: "Google Fit",     color: "#4285F4", bg: "bg-[#4285F4]/10", Icon: Activity },
  google_health:   { label: "Google Health",  color: "#4285F4", bg: "bg-[#4285F4]/10", Icon: HeartPulse },
  fitbit:          { label: "Fitbit",         color: "#00B0B9", bg: "bg-[#00B0B9]/10", Icon: Watch },
  garmin:          { label: "Garmin",         color: "#009CDE", bg: "bg-[#009CDE]/10", Icon: Watch },
  withings:        { label: "Withings",       color: "#1A8FBF", bg: "bg-[#1A8FBF]/10", Icon: HeartPulse },
  samsung_health:  { label: "Samsung Health", color: "#1428A0", bg: "bg-[#1428A0]/10", Icon: Smartphone },
  // Distinct from the HealthOS brand green so the badge actually reads
  // as "from Android" rather than blending into chrome (code-review
  // §L8). #3DDC84 is the official Android brand green used across the
  // Play Store and the Health Connect logo itself.
  health_connect:  { label: "Health Connect", color: "#3DDC84", bg: "bg-[#3DDC84]/10", Icon: Heart },
  manual:          { label: "Manual entry",   color: "#6B7280", bg: "bg-muted",        Icon: Hand },
};

export interface SourceBadgeProps {
  provider?: ProviderId | null;
  /** Render compact (icon + label) by default; pass "icon" to suppress text. */
  variant?: "default" | "icon" | "text";
  className?: string;
  title?: string;
}

/**
 * Consistent attribution chip used wherever a value's origin matters
 * (vitals, reports, history). Falls back to "manual" when no provider id is
 * supplied so the badge always renders something explainable.
 */
export function SourceBadge({
  provider,
  variant = "default",
  className,
  title,
}: SourceBadgeProps) {
  const t = useTranslations("primitives.source");
  const id: ProviderId = provider ?? "manual";
  const theme = PROVIDER_THEMES[id] ?? PROVIDER_THEMES.manual;
  const Icon = theme.Icon;

  // Always read every key so next-intl `i18n:check` stays green for static analysis.
  const localisedLabel = t(id as Parameters<typeof t>[0]);
  const labelText = localisedLabel || theme.label;

  const ariaLabel = title ?? `${t("ariaPrefix")} ${labelText}`;

  return (
    <span
      data-slot="source-badge"
      data-provider={id}
      title={ariaLabel}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        theme.bg,
        className,
      )}
      style={{ color: theme.color }}
    >
      {variant !== "text" && <Icon className="size-3" aria-hidden />}
      {variant !== "icon" && <span className="truncate">{labelText}</span>}
    </span>
  );
}
