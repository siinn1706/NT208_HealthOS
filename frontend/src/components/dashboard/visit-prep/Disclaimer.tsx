"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The single source of truth for the safety disclaimer rendered above every
 * routing card and on every print copy. Locked copy — do not parameterize.
 * (See plan §3 — "every routing card renders a fixed disclaimer pulled from
 * a single i18n key".)
 */
export function VisitPrepDisclaimer() {
  const t = useTranslations("dashboard.visitPrep");
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
    >
      <Info className="mt-0.5 size-4 flex-shrink-0 text-primary" aria-hidden />
      <p>{t("disclaimer")}</p>
    </div>
  );
}
