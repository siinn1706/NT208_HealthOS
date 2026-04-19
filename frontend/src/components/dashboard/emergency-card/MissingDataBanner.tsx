/**
 * MissingDataBanner — surfaces critical / recommended completeness nudges.
 *
 * Critical nudges (red) gate publishing unless the owner explicitly
 * acknowledges. Recommended nudges (amber) are informational only.
 * Each nudge has a "Fix in profile" deep link.
 */
"use client";

import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { CompletenessNudge } from "@/lib/emergency-card-types";

interface MissingDataBannerProps {
  nudges: CompletenessNudge[];
  completenessScore: number;
}

export function MissingDataBanner({ nudges, completenessScore }: MissingDataBannerProps) {
  const t = useTranslations("dashboard.emergencyCard.nudges");
  const locale = useLocale();

  if (nudges.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <p className="font-semibold">{t("complete")}</p>
        <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-300/80">
          {t("completeBody", { score: completenessScore })}
        </p>
      </div>
    );
  }

  const critical = nudges.filter((n) => n.level === "critical");
  const recommended = nudges.filter((n) => n.level === "recommended");

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg border px-4 py-3",
          critical.length > 0
            ? "border-red-300 bg-red-50 dark:border-red-800/40 dark:bg-red-950/30"
            : "border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-semibold",
              critical.length > 0
                ? "text-red-900 dark:text-red-300"
                : "text-amber-900 dark:text-amber-300"
            )}
          >
            {critical.length > 0
              ? t("criticalHeader", { n: critical.length })
              : t("recommendedHeader", { n: recommended.length })}
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {completenessScore}/100
          </p>
        </div>
      </div>

      {critical.length > 0 && (
        <NudgeList
          nudges={critical}
          icon={AlertTriangle}
          tone="critical"
          locale={locale}
          t={t}
        />
      )}
      {recommended.length > 0 && (
        <NudgeList
          nudges={recommended}
          icon={Info}
          tone="recommended"
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

function NudgeList({
  nudges,
  icon: Icon,
  tone,
  locale,
  t,
}: {
  nudges: CompletenessNudge[];
  icon: React.ElementType;
  tone: "critical" | "recommended";
  locale: string;
  t: ReturnType<typeof useTranslations<"dashboard.emergencyCard.nudges">>;
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {nudges.map((n) => {
        const fix = `/${locale}${n.fix_path}`;
        return (
          <li key={`${n.level}-${n.field}`}>
            <Link
              href={fix}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  tone === "critical"
                    ? "text-red-700 dark:text-red-400"
                    : "text-amber-700 dark:text-amber-400"
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t(`messages.${n.message_key}` as Parameters<typeof t>[0])}
                </p>
                <p className="text-xs text-muted-foreground">{t("fixInProfile")}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
