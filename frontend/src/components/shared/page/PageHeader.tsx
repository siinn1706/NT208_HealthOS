"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderAction {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional breadcrumb trail rendered above the title. */
  breadcrumbs?: React.ReactNode;
  /** ≤1 primary action recommended. */
  primaryAction?: React.ReactNode;
  /** ≤2 secondary actions recommended. */
  secondaryActions?: React.ReactNode;
  /** Optional metadata strip (timestamps, status pills) under the title row. */
  meta?: React.ReactNode;
  /** Optional tab strip rendered immediately under the header. */
  tabs?: React.ReactNode;
  /** Sticky header — useful on long scrolling pages. */
  sticky?: boolean;
  className?: string;
}

/**
 * Canonical page header used by every authenticated route. Enforces a single
 * action hierarchy (primary + ≤2 secondary), consistent type scale, and
 * predictable spacing so child pages can focus on content.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  sticky = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        sticky && "sticky top-0 z-20",
        className,
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {breadcrumbs && <div className="text-xs text-muted-foreground">{breadcrumbs}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {meta && <div className="pt-1 text-xs text-muted-foreground">{meta}</div>}
          </div>
          {(primaryAction || secondaryActions) && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {secondaryActions}
              {primaryAction}
            </div>
          )}
        </div>
        {tabs && <div className="-mx-4 sm:-mx-6 lg:-mx-8">{tabs}</div>}
      </div>
    </header>
  );
}
