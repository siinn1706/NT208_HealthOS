"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  OctagonX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerVariant = "info" | "success" | "warning" | "destructive";

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: BannerVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  ariaLabelClose?: string;
}

// Soft, tinted banners. Background is a 10 % tint of the semantic colour and
// text uses the saturated colour itself; this keeps the contrast high in both
// light and dark modes (where the semantic tokens swap to lighter accents).
const VARIANT_STYLES: Record<BannerVariant, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
};

const DEFAULT_ICONS: Record<BannerVariant, React.ReactNode> = {
  info: <Info className="size-4" aria-hidden="true" />,
  success: <CheckCircle2 className="size-4" aria-hidden="true" />,
  warning: <AlertTriangle className="size-4" aria-hidden="true" />,
  destructive: <OctagonX className="size-4" aria-hidden="true" />,
};

const VARIANT_ROLE: Record<BannerVariant, "alert" | "status"> = {
  info: "status",
  success: "status",
  warning: "alert",
  destructive: "alert",
};

export function Banner({
  variant = "info",
  title,
  description,
  icon,
  action,
  dismissible,
  onDismiss,
  ariaLabelClose = "Dismiss",
  className,
  children,
  ...rest
}: BannerProps) {
  return (
    <div
      role={VARIANT_ROLE[variant]}
      aria-live={variant === "destructive" || variant === "warning" ? "assertive" : "polite"}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-sm",
        VARIANT_STYLES[variant],
        className,
      )}
      {...rest}
    >
      <span className="mt-0.5 shrink-0 opacity-90">{icon ?? DEFAULT_ICONS[variant]}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-medium leading-tight">{title}</p>}
        {description && <p className="text-[13px] leading-snug opacity-90">{description}</p>}
        {children}
      </div>
      {action && <div className="ml-2 shrink-0 self-center">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={ariaLabelClose}
          className="shrink-0 self-start rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
