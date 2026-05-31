"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button-variants";
import type { VariantProps } from "class-variance-authority";

export interface PendingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
  pending?: boolean;
  /** Optional label rendered while pending; defaults to existing children. */
  pendingLabel?: React.ReactNode;
}

/**
 * Submit-style button that owns its loading affordance, prevents
 * double-submits, and provides a stable a11y name during async work.
 */
export function PendingButton({
  pending,
  pendingLabel,
  disabled,
  children,
  type = "submit",
  ref,
  ...rest
}: PendingButtonProps) {
  return (
    <Button
      ref={ref}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
