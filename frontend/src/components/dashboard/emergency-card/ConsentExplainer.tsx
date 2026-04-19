/**
 * ConsentExplainer — first-visit screen for the emergency-card feature.
 *
 * Shown when the user has never published an emergency card before. The
 * single CTA flips `is_published=true` via PATCH and triggers a router
 * refresh so the dashboard switches to the manager view on next render.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConsentExplainerProps {
  hasMinimumProfile: boolean;
}

export function ConsentExplainer({ hasMinimumProfile }: ConsentExplainerProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.emergencyCard.consent");
  const [submitting, setSubmitting] = React.useState(false);

  async function handlePublish() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/users/me/emergency-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });
      if (!res.ok) throw new Error("publish-failed");
      toast.success(t("published"));
      router.refresh();
    } catch {
      toast.error(t("publishFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <HeartPulse className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureBlock
            icon={Eye}
            title={t("feature1Title")}
            body={t("feature1Body")}
          />
          <FeatureBlock
            icon={Lock}
            title={t("feature2Title")}
            body={t("feature2Body")}
          />
          <FeatureBlock
            icon={ShieldCheck}
            title={t("feature3Title")}
            body={t("feature3Body")}
          />
        </div>

        <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {t("exposedTitle")}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>{t("exposed1")}</li>
            <li>{t("exposed2")}</li>
            <li>{t("exposed3")}</li>
            <li>{t("exposed4")}</li>
          </ul>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-foreground">
            {t("hiddenTitle")}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li className="flex items-center gap-1.5">
              <EyeOff className="size-3 shrink-0" aria-hidden /> {t("hidden1")}
            </li>
            <li className="flex items-center gap-1.5">
              <EyeOff className="size-3 shrink-0" aria-hidden /> {t("hidden2")}
            </li>
            <li className="flex items-center gap-1.5">
              <EyeOff className="size-3 shrink-0" aria-hidden /> {t("hidden3")}
            </li>
          </ul>
        </div>

        {!hasMinimumProfile && (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            {t("incompleteProfileWarning")}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t("revocableNote")}</p>
          <Button
            onClick={handlePublish}
            disabled={submitting}
            className="gap-2"
            size="lg"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {submitting ? t("publishing") : t("createCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3")}>
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
