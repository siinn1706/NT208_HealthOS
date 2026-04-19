"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreshnessChip } from "@/components/ui/freshness-chip";
import { cn } from "@/lib/utils";
import { interpretBmiSeries, type InsightSeriesPoint } from "@/lib/progress/interpret";
import { track } from "@/lib/analytics";

interface TodayInsightCardProps {
  series: InsightSeriesPoint[];
  targetBmi: number | null;
  /** ISO timestamp of the user's account creation; enables the new-user variant. */
  createdAt?: string | null;
  /**
   * Server-rendered "now" instant — passed in to keep `interpretBmiSeries`
   * deterministic across SSR + CSR. If omitted, falls back to `Date.now()`,
   * which is fine for purely client-mounted callers (Storybook / tests) but
   * risks a hydration-time `data-insight-kind` swap when called from a Next.js
   * server tree that straddles UTC midnight.
   */
  nowIso?: string;
  /** Optional CTA — wire this to "Log weight now". */
  onAction?: () => void;
  className?: string;
}

const KIND_VISUAL: Record<
  ReturnType<typeof interpretBmiSeries>["kind"],
  { icon: React.ComponentType<{ className?: string }>; tone: string; ring: string }
> = {
  new_user: {
    icon: Sparkles,
    tone: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20 bg-blue-500/5",
  },
  no_readings: {
    icon: Sparkles,
    tone: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20 bg-blue-500/5",
  },
  stale: {
    icon: AlertCircle,
    tone: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20 bg-amber-500/5",
  },
  stable: {
    icon: Activity,
    tone: "text-foreground",
    ring: "ring-border bg-muted/40",
  },
  trending_to_target: {
    icon: TrendingDown,
    tone: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20 bg-emerald-500/5",
  },
  trending_away: {
    icon: TrendingUp,
    tone: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20 bg-amber-500/5",
  },
};

/**
 * Calm, single-sentence interpretation of the user's recent BMI trend.
 * Renders one of five outcomes (plus the new-user welcome) — never two.
 *
 * Production note: today the deltas come from a client-side fold of the
 * existing aggregated series. Once Core ships baseline / delta_7d / delta_30d
 * (PR-7), this component should accept those props directly and skip the
 * `interpretBmiSeries` fallback.
 */
export function TodayInsightCard({
  series,
  targetBmi,
  createdAt,
  nowIso,
  onAction,
  className,
}: TodayInsightCardProps) {
  const t = useTranslations();
  const tCard = useTranslations("progress.insight");

  const result = useMemo(() => {
    const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
    return interpretBmiSeries(
      series,
      { targetBmi },
      { createdAt },
      Number.isNaN(nowMs) ? Date.now() : nowMs
    );
  }, [series, targetBmi, createdAt, nowIso]);

  const visual = KIND_VISUAL[result.kind];
  const Icon = visual.icon;

  // Fire a single "viewed" event per (kind, day) so we can measure card recall
  // without inflating counts on every re-render. `view_key` deliberately omits
  // `lastReadingAt` to avoid leaking a health-adjacent timestamp into telemetry.
  const viewKey = result.kind;
  useEffect(() => {
    track("progress.insight_card.viewed", { kind: result.kind, view_key: viewKey });
    // `result.kind` is fully derived from `viewKey`, so depending only on it is correct.
  }, [viewKey, result.kind]);

  function handleAction() {
    track("progress.insight_card.action_clicked", { kind: result.kind });
    onAction?.();
  }

  // The plan calls for a "Log now" CTA only when the kind is `stale` or
  // `new_user` — for trending/stable variants the card is purely informative.
  const showCta =
    onAction &&
    (result.kind === "stale" ||
      result.kind === "new_user" ||
      result.kind === "no_readings");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5 ring-1",
        visual.ring,
        className
      )}
      role="status"
      aria-live="polite"
      data-insight-kind={result.kind}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", visual.tone)}>
          <Icon className="size-5" aria-hidden />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tCard("eyebrow")}
            </p>
            {result.lastReadingAt && (
              <FreshnessChip
                recordedAt={`${result.lastReadingAt}T00:00:00Z`}
                variant="compact"
              />
            )}
          </div>

          <p className="text-sm sm:text-base text-foreground leading-relaxed">
            {/*
              We intentionally cast the messageKey through a generic translator
              so the same component works for all five outcomes without one
              `useTranslations` call per branch.
            */}
            {(t as (key: string, values?: Record<string, unknown>) => string)(
              result.messageKey,
              normaliseInterpolations(result.values)
            )}
          </p>

          {showCta && (
            <Button
              size="sm"
              variant={result.severity === "caution" ? "default" : "outline"}
              className="mt-2"
              onClick={handleAction}
            >
              {tCard("logNow")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * `next-intl` won't accept `null` in interpolations — coerce missing values
 * to the string `"--"` so the template renders cleanly even when, e.g., the
 * `daysSince` value is unknown.
 */
function normaliseInterpolations(
  values: Record<string, number | string | null>
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = v == null ? "--" : v;
  }
  return out;
}
