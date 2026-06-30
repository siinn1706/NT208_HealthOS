"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";

import { Link } from "@/navigation";
import {
  fetchDashboardAiAdvice,
  type DashboardAiAdvice,
  type DashboardAiAdviceActionType,
} from "@/lib/dashboard-ai-advice-client";
import { cn } from "@/lib/utils";

type AdviceState =
  | { status: "loading" }
  | { status: "ready"; advice: DashboardAiAdvice }
  | { status: "error" };

const ACTION_ROUTES: Record<DashboardAiAdviceActionType, string> = {
  log_meal: "/dashboard/meals/add",
  walk: "/dashboard/reports/trends",
  sleep_hygiene: "/dashboard/reports/trends",
  view_trends: "/dashboard/reports/trends",
  open_chat: "/dashboard/chat",
  track_vitals: "/dashboard/health",
};

function evidenceText(value: DashboardAiAdvice["evidence"][number]) {
  const unit = value.unit ? ` ${value.unit}` : "";
  const comparison = value.comparison ? ` · ${value.comparison}` : "";
  return `${value.metric}: ${value.value ?? "--"}${unit}${comparison}`;
}

export function AiAdvicePanel({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.aiAdvice");
  const [state, setState] = useState<AdviceState>({ status: "loading" });

  const loadAdvice = useCallback((signal?: AbortSignal) => {
    setState({ status: "loading" });
    fetchDashboardAiAdvice({ locale, surface: "web", signal })
      .then((advice) => setState({ status: "ready", advice }))
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ status: "error" });
      });
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    loadAdvice(controller.signal);
    return () => controller.abort();
  }, [loadAdvice]);

  const sourceLabel = useMemo(() => {
    if (state.status !== "ready") return null;
    return t(`source.${state.advice.source}`);
  }, [state, t]);

  if (state.status === "loading") {
    return (
      <div
        className={cn(
          "rounded-lg border border-primary/15 bg-primary/5 p-3",
          compact ? "space-y-2" : "space-y-3",
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="relative size-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-3.5 text-primary motion-safe:animate-pulse" aria-hidden />
            <span className="absolute inset-0 rounded-md border border-primary/20 motion-safe:animate-ping motion-reduce:animate-none" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">{t("loadingTitle")}</p>
            <p className="text-[10px] text-muted-foreground">{t("loadingBody")}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-1.5 rounded-full bg-primary/15 motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2" aria-live="polite">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 text-muted-foreground mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground">{t("errorTitle")}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t("errorBody")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadAdvice()}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
        >
          <RefreshCw className="size-3" aria-hidden />
          {t("retry")}
        </button>
      </div>
    );
  }

  const { advice } = state;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        advice.status === "fallback"
          ? "border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/15"
          : "border-primary/15 bg-primary/5",
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("eyebrow")}</p>
            {sourceLabel && (
              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {sourceLabel}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-foreground mt-1 leading-snug">{advice.title}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{advice.body}</p>
        </div>
      </div>

      {advice.evidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {advice.evidence.slice(0, compact ? 2 : 3).map((item) => (
            <span
              key={`${item.metric}-${item.value}`}
              className="rounded-full bg-background/70 px-2 py-1 text-[9px] text-muted-foreground"
            >
              {evidenceText(item)}
            </span>
          ))}
        </div>
      )}

      {advice.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {advice.actions.slice(0, 2).map((action) => (
            <Link
              key={action.id}
              href={action.route || ACTION_ROUTES[action.type]}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
            >
              {action.label}
              <ChevronRight className="size-3" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground leading-relaxed">{advice.disclaimer}</p>
    </div>
  );
}
