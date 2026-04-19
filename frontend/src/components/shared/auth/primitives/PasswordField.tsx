"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "./FormFieldError";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: React.ReactNode;
  error?: React.ReactNode | null | false;
  /** Optional helper hint rendered below the input when no error is shown. */
  hint?: React.ReactNode;
  /** Optional right-aligned slot in the label row (e.g., "Forgot password?"). */
  labelTrailing?: React.ReactNode;
  /** Wrap the input + reveal toggle in this className. */
  inputContainerClassName?: string;
  /** Optional render function for an extra slot (strength meter, breach notice). */
  renderBelow?: (value: string) => React.ReactNode;
  /** Mark the field as required visually (with `*`) and via aria. Default false. */
  requiredMark?: boolean;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      id,
      label,
      error,
      hint,
      labelTrailing,
      inputContainerClassName,
      renderBelow,
      className,
      value,
      onChange,
      placeholder = "••••••••",
      autoComplete = "current-password",
      requiredMark,
      required,
      ...rest
    },
    ref,
  ) {
    const t = useTranslations("auth");
    const [show, setShow] = React.useState(false);
    const [internal, setInternal] = React.useState(typeof value === "string" ? value : "");
    const stringValue = typeof value === "string" ? value : internal;

    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>
            {label}
            {requiredMark && (
              <span aria-hidden="true" className="ml-0.5 text-destructive">
                *
              </span>
            )}
          </Label>
          {labelTrailing}
        </div>
        <div className={cn("relative", inputContainerClassName)}>
          <Input
            ref={ref}
            id={id}
            type={show ? "text" : "password"}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={value === undefined ? internal : value}
            onChange={(e) => {
              if (value === undefined) setInternal(e.target.value);
              onChange?.(e);
            }}
            required={required}
            aria-required={required || requiredMark || undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={
              [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined
            }
            className={cn("pr-10", className)}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("hidePassword") : t("showPassword")}
            aria-pressed={show}
            tabIndex={0}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:text-foreground"
          >
            {show ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {!error && hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        <FormFieldError id={errorId} message={error} />
        {renderBelow?.(stringValue)}
      </div>
    );
  },
);
