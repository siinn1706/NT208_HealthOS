"use client";

import * as React from "react";
import {
  CircleAlert,
  Inbox,
  Lock,
  RefreshCcw,
  Search,
  ServerCrash,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type StateViewKind =
  | "empty-first-use"
  | "empty-no-results"
  | "empty-no-data-in-range"
  | "error"
  | "offline"
  | "permission-denied"
  | "not-found"
  | "not-implemented";

export interface StateViewAction {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface StateViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  kind?: StateViewKind;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: StateViewAction;
  secondaryAction?: StateViewAction;
  /**
   * Visual density. `route` is for full route-level emptiness (`loading.tsx`-like
   * frames or 404 pages); `section` for in-page empty cards.
   */
  density?: "route" | "section";
}

const DEFAULT_ICONS: Record<StateViewKind, React.ReactNode> = {
  "empty-first-use": <Sparkles className="size-6" aria-hidden="true" />,
  "empty-no-results": <Search className="size-6" aria-hidden="true" />,
  "empty-no-data-in-range": <Inbox className="size-6" aria-hidden="true" />,
  error: <ServerCrash className="size-6" aria-hidden="true" />,
  offline: <WifiOff className="size-6" aria-hidden="true" />,
  "permission-denied": <Lock className="size-6" aria-hidden="true" />,
  "not-found": <CircleAlert className="size-6" aria-hidden="true" />,
  "not-implemented": <Sparkles className="size-6" aria-hidden="true" />,
};

function ActionButton({ action }: { action: StateViewAction }) {
  if (action.href) {
    return (
      <Button asChild variant={action.variant ?? "default"} size="sm">
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button onClick={action.onClick} variant={action.variant ?? "default"} size="sm">
      {action.label}
    </Button>
  );
}

export function StateView({
  kind = "empty-first-use",
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  density = "section",
  className,
  ...rest
}: StateViewProps) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        density === "route"
          ? "min-h-[60vh] px-6 py-16"
          : "rounded-lg border border-dashed border-border/70 bg-muted/30 px-6 py-10",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          density === "route" ? "size-16 bg-muted text-foreground" : "size-12 bg-background text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {icon ?? DEFAULT_ICONS[kind]}
      </div>
      <div className="max-w-md space-y-1">
        <p className={cn("font-semibold", density === "route" ? "text-xl" : "text-base")}>{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && <ActionButton action={primaryAction} />}
          {secondaryAction && (
            <ActionButton
              action={{ ...secondaryAction, variant: secondaryAction.variant ?? "outline" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorStateView({
  title,
  description,
  onRetry,
  retryLabel,
  density = "route",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  /**
   * Caller MUST pass a translated label when `onRetry` is provided. We avoid
   * an English fallback here so a missing translation is loud, not silent.
   */
  retryLabel?: React.ReactNode;
  density?: "route" | "section";
}) {
  return (
    <StateView
      kind="error"
      title={title}
      description={description}
      density={density}
      primaryAction={
        onRetry
          ? {
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCcw className="size-3.5" aria-hidden="true" />
                  {retryLabel}
                </span>
              ),
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
