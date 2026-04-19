"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AuthShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional banner area rendered above the form (use `<AuthBanner />`). */
  banner?: React.ReactNode;
  footer?: React.ReactNode;
  /** Brand chip rendered above the title. */
  brand?: React.ReactNode;
  contentClassName?: string;
  cardClassName?: string;
}

function DefaultBrand() {
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden="true"
        className="size-8 rounded-lg bg-primary flex items-center justify-center"
      >
        <span className="text-primary-foreground font-bold text-sm">H</span>
      </div>
      <span className="font-semibold text-foreground">HealthOS</span>
    </div>
  );
}

/**
 * Visual frame for every authentication-related screen.
 * Standardises card width, header rhythm, and the `banner / form / footer` slot
 * order so that login/register/verify/forgot share one chrome.
 */
export function AuthShell({
  title,
  subtitle,
  banner,
  footer,
  brand,
  children,
  className,
  contentClassName,
  cardClassName,
  ...rest
}: AuthShellProps) {
  return (
    <div
      className={cn("w-full max-w-md animate-fade-in-up", className)}
      {...rest}
    >
      <Card className={cn("shadow-lg", cardClassName)}>
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2">{brand ?? <DefaultBrand />}</div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {title}
          </CardTitle>
          {subtitle && (
            <CardDescription className="text-muted-foreground">
              {subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={cn("space-y-4", contentClassName)}>
          {banner}
          {children}
        </CardContent>
        {footer && (
          <CardFooter className="justify-center pt-0">{footer}</CardFooter>
        )}
      </Card>
    </div>
  );
}
