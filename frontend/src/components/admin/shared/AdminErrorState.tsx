"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RefreshCcw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminErrorStateProps {
  /** Human-readable description of what went wrong. */
  reason: string;
  /** Called when the user activates the retry button. */
  onRetry: () => void;
  /**
   * Number of retries remaining. When ≤ 0 the retry button is replaced by a
   * "Please reload the page" message (Requirement 10.5).
   */
  retriesLeft: number;
  /**
   * `"page"` (default) — full-page centered card with icon.
   * `"inline"` — compact, no icon, smaller padding.
   */
  variant?: "page" | "inline";
  className?: string;
}

/**
 * Standard error state for admin pages.
 *
 * - Renders the failure `reason` and a retry button while `retriesLeft > 0`.
 * - When `retriesLeft <= 0` the retry button is replaced by a reload prompt.
 * - Respects `prefers-reduced-motion` via Tailwind's `motion-safe:` modifier.
 * - Uses only design tokens — no hard-coded colors or spacing.
 *
 * Validates: Requirements 10.4, 10.5, 11.1, 11.2
 */
export function AdminErrorState({
  reason,
  onRetry,
  retriesLeft,
  variant = "page",
  className,
}: AdminErrorStateProps) {
  const tc = useTranslations("admin.common");
  const te = useTranslations("admin.errors");
  const canRetry = retriesLeft > 0;
  const isInline = variant === "inline";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-center",
        isInline ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      {/* Icon — page variant only */}
      {!isInline && (
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full bg-[var(--admin-status-danger-soft)] text-[var(--admin-status-danger)]",
            "motion-safe:transition-opacity motion-safe:duration-200",
          )}
          aria-hidden="true"
        >
          <ServerCrash className="size-6" />
        </div>
      )}

      {/* Text */}
      <div className="max-w-md space-y-1">
        <p className="text-base font-semibold text-[var(--admin-fg)]">
          Something went wrong
        </p>
        <p className="text-sm text-[var(--admin-fg-muted)]">{reason}</p>
      </div>

      {/* Action */}
      {canRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="motion-safe:transition-colors motion-safe:duration-150 border-[var(--admin-border)] text-[var(--admin-fg)]"
        >
          <RefreshCcw className="size-3.5" aria-hidden="true" />
          {tc("retry")}
          {retriesLeft < 3 && (
            <span className="ml-1 text-xs text-[var(--admin-fg-muted)]">
              ({retriesLeft} left)
            </span>
          )}
        </Button>
      ) : (
        <p className="text-sm text-[var(--admin-fg-muted)]">
          {te("noRetries")}
        </p>
      )}
    </div>
  );
}
