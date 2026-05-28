"use client";

// PlanBadge.tsx — plan code display badge with i18n label lookup
// Requirements: 11.5, 13.4

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { getPlanTierColor } from "@/lib/admin/plan-catalog";

interface PlanBadgeProps {
  /** Raw plan code string (e.g. "free", "basic", or an unrecognized value). */
  code?: string;
  /**
   * Visual variant:
   * - `"known"` (default) — plan-tier colored badge using `--admin-plan-*` tokens.
   * - `"warning"` — destructive style for unrecognized plan codes.
   */
  variant?: "known" | "warning";
  /**
   * Optional children override. When provided, children are rendered instead
   * of the i18n-resolved plan label.
   */
  children?: React.ReactNode;
}

/**
 * Renders a localized plan label inside a `Badge`.
 *
 * - Known codes use `--admin-plan-*` CSS tokens for tier-specific coloring.
 * - Unknown codes (or explicit `variant="warning"`) use the destructive style (R13.4).
 * - When `children` are provided they override the derived label.
 */
export function PlanBadge({
  code,
  variant = "known",
  children,
}: PlanBadgeProps) {
  const t = useTranslations("admin.subscriptions.planLabels");

  // Resolve label: i18n key → fallback to raw code (Validation D6)
  const resolvedLabel = children ?? (code !== undefined
    ? (() => { try { return t(code as Parameters<typeof t>[0]); } catch { return code; } })()
    : "");

  const badgeVariant = variant === "warning" ? "destructive" : "default";
  const tierColor = variant === "known" && code !== undefined ? getPlanTierColor(code) : null;
  const tierStyle = tierColor
    ? {
        color: tierColor,
        backgroundColor: `color-mix(in srgb, ${tierColor} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${tierColor} 25%, transparent)`,
      }
    : undefined;

  return (
    <Badge variant={badgeVariant} style={tierStyle}>
      {resolvedLabel}
    </Badge>
  );
}
