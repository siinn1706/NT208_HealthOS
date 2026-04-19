"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonX } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineNoticeVariant = "info" | "success" | "warning" | "destructive";

export interface InlineNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: InlineNoticeVariant;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<InlineNoticeVariant, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const DEFAULT_ICONS: Record<InlineNoticeVariant, React.ReactNode> = {
  info: <Info className="size-3.5" aria-hidden="true" />,
  success: <CheckCircle2 className="size-3.5" aria-hidden="true" />,
  warning: <AlertTriangle className="size-3.5" aria-hidden="true" />,
  destructive: <OctagonX className="size-3.5" aria-hidden="true" />,
};

export function InlineNotice({
  variant = "info",
  icon,
  className,
  children,
  ...rest
}: InlineNoticeProps) {
  return (
    <div
      role={variant === "destructive" || variant === "warning" ? "alert" : "status"}
      aria-live={variant === "destructive" || variant === "warning" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-1.5 text-xs leading-snug",
        VARIANT_STYLES[variant],
        className,
      )}
      {...rest}
    >
      <span className="mt-0.5 shrink-0">{icon ?? DEFAULT_ICONS[variant]}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
