"use client";

import * as React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Frosted-glass surface for HealthOS logo badges only — do not reuse for user avatars. */
export const brandMarkGlassBadgeSurfaceClassName =
  "backdrop-blur-xl bg-gradient-to-br from-white/95 via-[#E8F8FD]/85 to-[#B8F0FA]/75 border border-[#B8F0FA]/60 shadow-[0_12px_32px_rgba(65,188,230,0.22),inset_0_1px_0_rgba(255,255,255,0.78)] dark:from-white/12 dark:via-night-700/45 dark:to-night-400/25 dark:border-night-300/20 dark:shadow-[0_12px_32px_rgba(65,188,230,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]";

export interface AuthShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional banner area rendered above the form (use `<AuthBanner />`). */
  banner?: React.ReactNode;
  footer?: React.ReactNode;
  /** Brand chip rendered above the title. */
  brand?: React.ReactNode;
  /** Heading level for the title. Use "h1" on standalone auth pages (one per page). Defaults to "h2". */
  titleAs?: "h1" | "h2";
  contentClassName?: string;
  cardClassName?: string;
}

export function BrandMarkIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={48}
      height={48}
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
}

function DefaultBrand() {
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden="true"
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          brandMarkGlassBadgeSurfaceClassName,
        )}
      >
        <BrandMarkIcon className="size-5" />
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
  titleAs,
  children,
  className,
  contentClassName,
  cardClassName,
  ...rest
}: AuthShellProps) {
  const TitleEl = titleAs ?? "h2";
  return (
    <div
      className={cn("w-full max-w-md animate-fade-in-up", className)}
      {...rest}
    >
      <Card className={cn("shadow-lg", cardClassName)}>
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2">{brand ?? <DefaultBrand />}</div>
          <TitleEl className="text-2xl font-bold text-foreground">
            {title}
          </TitleEl>
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
