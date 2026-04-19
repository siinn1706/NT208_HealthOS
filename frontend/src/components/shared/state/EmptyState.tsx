"use client";

import * as React from "react";
import { StateView, type StateViewKind, type StateViewAction } from "./StateView";

/**
 * Convenience wrapper around StateView for the "empty data" family of states.
 * Emit `kind` to disambiguate first-use vs. no-results vs. no-data-in-range.
 */
export interface EmptyStateProps {
  kind?: Extract<StateViewKind, "empty-first-use" | "empty-no-results" | "empty-no-data-in-range">;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: StateViewAction;
  secondaryAction?: StateViewAction;
  density?: "route" | "section";
  className?: string;
}

export function EmptyState({
  kind = "empty-first-use",
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  density = "section",
  className,
}: EmptyStateProps) {
  return (
    <StateView
      kind={kind}
      icon={icon}
      title={title}
      description={description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      density={density}
      className={className}
    />
  );
}
