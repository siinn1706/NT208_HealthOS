"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { FormFieldError } from "./FormFieldError";

export interface OtpFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Total OTP length. Defaults to 6. */
  length?: number;
  /** Optional separator after the Nth slot (e.g. 3). Hidden when undefined. */
  separatorAfter?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  error?: React.ReactNode | null | false;
  hint?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onComplete?: (value: string) => void;
  /**
   * Optional override for the input pattern. Defaults to digits-only, which
   * is the right choice for the email/SMS OTPs HealthOS issues.
   */
  pattern?: string;
}

/**
 * Accessible OTP input wrapper around shadcn's `InputOTP`. Hardens default
 * a11y (aria-label, error wiring) and exposes an `onComplete` callback that
 * fires once the full code is entered.
 */
export function OtpField({
  id = "otp",
  value,
  onChange,
  length = 6,
  separatorAfter,
  disabled,
  autoFocus,
  ariaLabel,
  error,
  hint,
  className,
  containerClassName,
  onComplete,
  pattern = REGEXP_ONLY_DIGITS,
}: OtpFieldProps) {
  const t = useTranslations("auth");
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) {
      completedRef.current = false;
    }
  }, [value, length, onComplete]);

  const slots = Array.from({ length }, (_, i) => (
    <InputOTPSlot key={i} index={i} />
  ));

  const groups = (() => {
    if (!separatorAfter || separatorAfter <= 0 || separatorAfter >= length) {
      return <InputOTPGroup>{slots}</InputOTPGroup>;
    }
    return (
      <>
        <InputOTPGroup>{slots.slice(0, separatorAfter)}</InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>{slots.slice(separatorAfter)}</InputOTPGroup>
      </>
    );
  })();

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className={cn("flex justify-center", className)}>
        <InputOTP
          id={id}
          maxLength={length}
          pattern={pattern}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel ?? t("verifyTitle")}
          aria-invalid={!!error || undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined
          }
        >
          {groups}
        </InputOTP>
      </div>
      {!error && hint && (
        <p id={hintId} className="text-center text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <div className="flex justify-center">
          <FormFieldError id={errorId} message={error} />
        </div>
      )}
    </div>
  );
}
