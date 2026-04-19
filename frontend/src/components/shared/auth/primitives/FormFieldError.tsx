"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** When falsy nothing is rendered; this lets callers stay declarative. */
  message?: React.ReactNode | null | false;
  /** id used to wire `aria-describedby` from the controlled input. */
  id?: string;
}

export function FormFieldError({
  message,
  id,
  className,
  ...rest
}: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("text-xs text-destructive", className)}
      {...rest}
    >
      {message}
    </p>
  );
}
