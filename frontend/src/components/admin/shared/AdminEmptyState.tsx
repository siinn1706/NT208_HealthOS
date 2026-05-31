"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminEmptyStateProps {
  /** Descriptive message explaining why the list is empty. */
  message: string;
  /**
   * When `true` AND `onClearFilters` is provided, renders a "Clear filters"
   * button so the user can reset the current filter set (Requirement 10.6).
   */
  hasFilters?: boolean;
  /** Called when the user activates the "Clear filters" button. */
  onClearFilters?: () => void;
  /**
   * `"page"` (default) — full-page centered card with icon.
   * `"inline"` — compact, no icon, smaller padding (for table-body contexts).
   */
  variant?: "page" | "inline";
  className?: string;
}

/**
 * Standard empty state for admin list pages.
 *
 * - Renders a descriptive `message` when a list returns zero items.
 * - When `hasFilters` is true and `onClearFilters` is provided, renders a
 *   "Clear filters" button so the user can widen the result set.
 * - Uses only design tokens — no hard-coded colors or spacing.
 *
 * Validates: Requirements 10.6, 11.1, 11.2
 */
export function AdminEmptyState({
  message,
  hasFilters = false,
  onClearFilters,
  variant = "page",
  className,
}: AdminEmptyStateProps) {
  const tc = useTranslations("admin.common");
  const showClearFilters = hasFilters && typeof onClearFilters === "function";
  const isInline = variant === "inline";

  return (
    <output
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-center",
        isInline ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      {/* Icon — page variant only */}
      {!isInline && (
        <div
          className="flex size-12 items-center justify-center rounded-full bg-[var(--admin-surface)] text-[var(--admin-fg-muted)]"
          aria-hidden="true"
        >
          <Inbox className="size-6" />
        </div>
      )}

      {/* Message */}
      <p className="max-w-md text-sm text-[var(--admin-fg-muted)]">{message}</p>

      {/* Clear filters action */}
      {showClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="motion-safe:transition-colors motion-safe:duration-150 border-[var(--admin-border)] text-[var(--admin-fg)]"
        >
          <X className="size-3.5" aria-hidden="true" />
          {tc("clearFilters")}
        </Button>
      )}
    </output>
  );
}
