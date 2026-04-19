"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Save, SkipForward } from "lucide-react";

/**
 * Onboarding step 0 — sets expectations for the rest of the wizard. We keep it
 * intentionally light so users understand what they're committing to and that
 * they can leave at any time without losing data.
 */
export function OnboardingWelcome() {
  const t = useTranslations("onboarding.welcome");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
          <span>{t("bullets.private")}</span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Save className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
          <span>{t("bullets.resume")}</span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <SkipForward className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <span>{t("bullets.skipOptional")}</span>
        </li>
      </ul>
    </div>
  );
}
