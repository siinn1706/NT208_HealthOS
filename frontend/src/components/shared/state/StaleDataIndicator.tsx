"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a small "Updated N min ago" / "Stale" pill next to a widget header.
 * Switches to a warning style once `staleAfterMs` has elapsed since `updatedAt`.
 */
export interface StaleDataIndicatorProps {
  updatedAt?: Date | string | number | null;
  staleAfterMs?: number;
  className?: string;
}

function diffLabel(now: number, then: number): { unit: "now" | "min" | "hr" | "day"; n: number } {
  const ms = Math.max(0, now - then);
  const min = Math.round(ms / 60_000);
  if (min < 1) return { unit: "now", n: 0 };
  if (min < 60) return { unit: "min", n: min };
  const hr = Math.round(min / 60);
  if (hr < 24) return { unit: "hr", n: hr };
  return { unit: "day", n: Math.round(hr / 24) };
}

export function StaleDataIndicator({
  updatedAt,
  staleAfterMs = 5 * 60_000,
  className,
}: StaleDataIndicatorProps) {
  const t = useTranslations("state");
  const [nowMs, setNowMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!updatedAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <Clock className="size-3" aria-hidden="true" />
        {t("noFreshness")}
      </span>
    );
  }

  const then = new Date(updatedAt).getTime();
  const now = nowMs ?? then;
  const { unit, n } = diffLabel(now, then);
  const isStale = now - then > staleAfterMs;

  const label = (() => {
    switch (unit) {
      case "now":
        return t("freshness.justNow");
      case "min":
        return t("freshness.minAgo", { n });
      case "hr":
        return t("freshness.hrAgo", { n });
      default:
        return t("freshness.dayAgo", { n });
    }
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px]",
        isStale ? "text-warning" : "text-muted-foreground",
        className,
      )}
      title={new Date(then).toISOString()}
    >
      {isStale ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : (
        <Clock className="size-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
