"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Reusable safety footer for the Medication Hub. Mirrors the warm-gold
 * disclaimer styling used in the prescription viewer so the same visual
 * language carries across the app.
 *
 * Two presentations:
 *   * `tone="page"` (default) — long-form footer for Hub / Detail pages.
 *   * `tone="dialog"` — short, dense reminder for Add / Import modals where
 *     vertical space is tight (review M17).
 */
interface MedicationDisclaimerProps {
  tone?: "page" | "dialog";
  className?: string;
}

export function MedicationDisclaimer({
  tone = "page",
  className,
}: MedicationDisclaimerProps) {
  const t = useTranslations("dashboard.medications");
  const messageKey = tone === "dialog" ? "addDisclaimer" : "disclaimer";
  return (
    <div
      className={cn(
        "rounded-xl border border-warm-gold/40 bg-warm-gold/10",
        tone === "page" ? "px-4 py-3" : "px-3 py-2",
        className,
      )}
    >
      <p className="text-xs text-foreground leading-relaxed">{t(messageKey)}</p>
    </div>
  );
}
