"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CircleSlash,
  Inbox,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FreshnessChip } from "@/components/ui/freshness-chip";
import { ConfidenceChip } from "@/components/ui/confidence-chip";
import type { DataSlice, DataSliceStatus } from "@/types/data-slice";

interface DataStateProps<T> {
  slice: DataSlice<T>;
  /** Renderer for the success / partial / degraded / stale paths. */
  children: (data: T, slice: DataSlice<T>) => React.ReactNode;

  /** Per-status overrides. When omitted the built-in defaults are used. */
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  emptyInRange?: React.ReactNode;
  pending?: React.ReactNode;
  noPermission?: React.ReactNode;
  recoverableError?: React.ReactNode;
  hardError?: React.ReactNode;

  /** Action handlers (wired into default UIs). */
  onRetry?: () => void;
  onChangeRange?: () => void;
  onRequestPermission?: () => void;
  onContactSupport?: () => void;

  /** Layout knobs. */
  className?: string;
  minHeight?: number | string;
}

const STATUS_DATA_AVAILABLE: Record<DataSliceStatus, boolean> = {
  loading:           false,
  syncing:           true,
  stale:             true,
  partial:           true,
  no_permission:     false,
  empty:             false,
  empty_in_range:    false,
  pending:           false,
  degraded:          true,
  success:           true,
  recoverable_error: false,
  hard_error:        false,
};

/**
 * Single primitive that renders the right UI for every {@link DataSliceStatus}.
 * Surfaces no longer hand-roll loading skeletons / empty states / error chrome —
 * they describe their data slice and pass a render-prop for the happy path.
 *
 * Optional overrides accept arbitrary nodes so a surface can keep its own
 * domain-specific empty / error illustrations while still benefiting from
 * status routing and a consistent vocabulary.
 */
export function DataState<T>({
  slice,
  children,
  loading,
  empty,
  emptyInRange,
  pending,
  noPermission,
  recoverableError,
  hardError,
  onRetry,
  onChangeRange,
  onRequestPermission,
  onContactSupport,
  className,
  minHeight = 160,
}: DataStateProps<T>) {
  const t = useTranslations("primitives.dataState");

  const wrapperStyle: React.CSSProperties = {
    minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
  };

  const renderShell = (content: React.ReactNode, extraClass?: string) => (
    <output
      data-slot="data-state"
      data-status={slice.status}
      className={cn(
        "flex w-full items-center justify-center rounded-xl border border-border/50 bg-card/30 p-6 text-center",
        extraClass,
        className,
      )}
      style={wrapperStyle}
    >
      {content}
    </output>
  );

  switch (slice.status) {
    case "loading":
      if (loading) return <>{loading}</>;
      return (
        <div
          data-slot="data-state"
          data-status="loading"
          aria-busy
          className={cn("space-y-2", className)}
          style={wrapperStyle}
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      );

    case "pending":
      if (pending) return <>{pending}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("pendingTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t("pendingBody")}</p>
        </div>,
      );

    case "no_permission":
      if (noPermission) return <>{noPermission}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <Lock className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("noPermissionTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {slice.error?.message ?? t("noPermissionBody")}
          </p>
          {onRequestPermission && (
            <button
              type="button"
              onClick={onRequestPermission}
              className="mt-2 h-8 rounded-lg bg-primary/10 text-primary px-3 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            >
              {t("noPermissionCta")}
            </button>
          )}
        </div>,
      );

    case "empty":
      if (empty) return <>{empty}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <Inbox className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t("emptyBody")}</p>
        </div>,
      );

    case "empty_in_range":
      if (emptyInRange) return <>{emptyInRange}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <CircleSlash className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("emptyInRangeTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t("emptyInRangeBody")}</p>
          {onChangeRange && (
            <button
              type="button"
              onClick={onChangeRange}
              className="mt-2 h-8 rounded-lg bg-primary/10 text-primary px-3 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            >
              {t("emptyInRangeCta")}
            </button>
          )}
        </div>,
      );

    case "recoverable_error":
      if (recoverableError) return <>{recoverableError}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <WifiOff className="size-5 text-warning" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("recoverableErrorTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {slice.error?.message ?? t("recoverableErrorBody")}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary px-3 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3" />
              {t("retry")}
            </button>
          )}
        </div>,
      );

    case "hard_error":
      if (hardError) return <>{hardError}</>;
      return renderShell(
        <div className="flex flex-col items-center gap-2">
          <TriangleAlert className="size-5 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t("hardErrorTitle")}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {slice.error?.message ?? t("hardErrorBody")}
          </p>
          {slice.error?.code && (
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
              {slice.error.code}
            </p>
          )}
          {onContactSupport && (
            <button
              type="button"
              onClick={onContactSupport}
              className="mt-2 h-8 rounded-lg bg-destructive/10 text-destructive px-3 text-xs font-medium hover:bg-destructive/20 transition-colors cursor-pointer"
            >
              {t("contactSupport")}
            </button>
          )}
        </div>,
      );

    case "syncing":
    case "stale":
    case "partial":
    case "degraded":
    case "success":
    default: {
      if (!STATUS_DATA_AVAILABLE[slice.status] || slice.data === undefined) {
        // Defensive: a status that claims data is available but the slice is
        // empty must surface an error rather than rendering blank content.
        return renderShell(
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground max-w-xs">
              {t("missingPayload")}
            </p>
          </div>,
        );
      }
      return (
        <div data-slot="data-state" data-status={slice.status} className={className}>
          {slice.status !== "success" && (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              {slice.status === "syncing" && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  {t("syncingChip")}
                </span>
              )}
              {slice.status === "stale" && (
                <FreshnessChip
                  recordedAt={slice.meta?.recorded_at}
                  ingestedAt={slice.meta?.ingested_at}
                  variant="expanded"
                />
              )}
              {slice.status === "partial" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                  <AlertTriangle className="size-3" />
                  {t("partialChip")}
                </span>
              )}
              {slice.status === "degraded" && (
                <>
                  {/*
                   * "Degraded" describes service / pipeline health (a fallback
                   * model fired, an upstream provider failed, etc.) — it is
                   * intentionally separate from per-row AI confidence. The
                   * dedicated warning chip flags the degradation; the confidence
                   * chip is only attached when an explicit value is provided
                   * via slice.meta so we never invent a confidence reading.
                   */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                    <AlertTriangle className="size-3" />
                    {t("degradedChip")}
                  </span>
                  {typeof slice.meta?.confidence === "number" && (
                    <ConfidenceChip value={slice.meta.confidence} />
                  )}
                </>
              )}
              {slice.status === "stale" && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3" />
                  {t("refresh")}
                </button>
              )}
              {slice.meta?.source && (
                <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                  <Sparkles className="size-3 opacity-70" />
                  {slice.meta.source}
                </span>
              )}
            </div>
          )}
          {children(slice.data as T, slice)}
        </div>
      );
    }
  }
}
