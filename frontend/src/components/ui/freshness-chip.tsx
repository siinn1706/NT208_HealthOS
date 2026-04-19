"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Clock, CircleSlash } from "lucide-react";

import { cn } from "@/lib/utils";
import { freshnessTierFor, type FreshnessTier } from "@/types/data-slice";

interface FreshnessChipProps {
  /** ISO timestamp of when the value was *recorded* by source. Preferred. */
  recordedAt?: string | null;
  /** ISO timestamp of when the value was *ingested* into our system. Fallback. */
  ingestedAt?: string | null;
  /** Override the computed tier — useful for tests / storybook. */
  tier?: FreshnessTier;
  className?: string;
  /** Render compact ("dot + label") or expanded ("icon + label + relative time"). */
  variant?: "compact" | "expanded";
}

const TIER_THEME: Record<FreshnessTier, { dot: string; text: string; ring: string }> = {
  live:       { dot: "bg-success",              text: "text-success",          ring: "ring-success/20" },
  recent:     { dot: "bg-success/70",           text: "text-success",          ring: "ring-success/15" },
  stale:      { dot: "bg-warning",              text: "text-warning",          ring: "ring-warning/20" },
  very_stale: { dot: "bg-destructive",          text: "text-destructive",      ring: "ring-destructive/20" },
  no_data:    { dot: "bg-muted-foreground/40",  text: "text-muted-foreground", ring: "ring-muted-foreground/20" },
};

function relativeTimeShort(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffMin = Math.max(0, Math.floor((now - t) / 60_000));
  if (diffMin < 1) return "<1m";
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Tiered freshness indicator. Tiers (per UX plan section K):
 *   live       <15 minutes
 *   recent     <6 hours
 *   stale      <48 hours
 *   very_stale >=48 hours
 *   no_data    no value
 */
export function FreshnessChip({
  recordedAt,
  ingestedAt,
  tier: tierOverride,
  className,
  variant = "compact",
}: FreshnessChipProps) {
  const t = useTranslations("primitives.freshness");
  // Hydration-safe: lock "now" on first render so SSR + CSR agree until a state
  // change updates it. This avoids hydration mismatches on long-lived pages.
  const [now] = React.useState<number>(() => Date.now());
  const iso = recordedAt ?? ingestedAt ?? null;
  const tier = tierOverride ?? freshnessTierFor(iso, now);
  const theme = TIER_THEME[tier];

  const label = t(tier as Parameters<typeof t>[0]);
  const Icon = tier === "no_data" ? CircleSlash : Clock;

  return (
    <span
      data-slot="freshness-chip"
      data-tier={tier}
      title={iso ?? label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ring-1",
        theme.text,
        theme.ring,
        "bg-background/40",
        className,
      )}
    >
      {variant === "compact" ? (
        <span className={cn("size-1.5 rounded-full", theme.dot)} aria-hidden />
      ) : (
        <Icon className="size-3" aria-hidden />
      )}
      <span className="truncate">{label}</span>
      {variant === "expanded" && iso && tier !== "no_data" && (
        <span className="text-muted-foreground">· {relativeTimeShort(iso, now)}</span>
      )}
    </span>
  );
}
