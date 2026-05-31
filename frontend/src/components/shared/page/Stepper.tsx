"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperItem {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  optional?: boolean;
}

export interface StepperProps {
  steps: StepperItem[];
  /** Index of the currently active step (0-based). */
  activeIndex: number;
  /** Indices that are visually marked as completed. Defaults to all steps before activeIndex. */
  completedIndexes?: number[];
  /** Optional click handler for step labels. Disabled steps won't fire. */
  onStepClick?: (index: number) => void;
  /** Indices the user is allowed to jump back to. */
  navigableIndexes?: number[];
  className?: string;
  ariaLabel?: string;
  variant?: "horizontal" | "compact";
  /**
   * Translated label shown for steps marked `optional`. Required when any
   * step is optional; we don't hardcode "Optional" because consumers live in
   * a bilingual surface.
   */
  optionalLabel?: string;
}

/**
 * Step indicator used by setup-style flows. Defaults to a horizontal pill
 * layout; switch to "compact" for very narrow shells (mobile drawers).
 */
export function Stepper({
  steps,
  activeIndex,
  completedIndexes,
  onStepClick,
  navigableIndexes,
  className,
  ariaLabel = "Progress",
  variant = "horizontal",
  optionalLabel,
}: StepperProps) {
  const completed = React.useMemo(() => {
    if (completedIndexes) return new Set(completedIndexes);
    return new Set(Array.from({ length: activeIndex }, (_, i) => i));
  }, [completedIndexes, activeIndex]);

  const navigable = React.useMemo(
    () => new Set(navigableIndexes ?? Array.from({ length: activeIndex }, (_, i) => i)),
    [navigableIndexes, activeIndex],
  );

  return (
    <ol
      aria-label={ariaLabel}
      className={cn(
        "flex w-full",
        variant === "horizontal" ? "items-center gap-2 sm:gap-3" : "items-center gap-1.5",
        className,
      )}
    >
      {steps.map((step, i) => {
        const isActive = i === activeIndex;
        const isDone = completed.has(i);
        const canNavigate = navigable.has(i) && !!onStepClick && !isActive;
        const indicator = (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
              variant === "horizontal" ? "size-7" : "size-6",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : isDone
                  ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-background text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {isDone ? <Check className="size-3.5" /> : i + 1}
          </span>
        );
        const inner = (
          <>
            {indicator}
            {variant === "horizontal" && (
              <span className="hidden min-w-0 flex-col text-left sm:flex">
                <span
                  className={cn(
                    "truncate text-xs font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {step.optional && optionalLabel && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {optionalLabel}
                  </span>
                )}
              </span>
            )}
          </>
        );
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-3">
            {canNavigate ? (
              <button
                type="button"
                onClick={() => onStepClick?.(i)}
                aria-current={isActive ? "step" : undefined}
                className="flex items-center gap-2 rounded-full px-1 py-0.5 text-left transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inner}
              </button>
            ) : (
              <span
                aria-current={isActive ? "step" : undefined}
                className="flex items-center gap-2"
              >
                {inner}
              </span>
            )}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  variant === "horizontal" ? "min-w-[12px]" : "min-w-[6px]",
                  isDone ? "bg-emerald-500/60" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
