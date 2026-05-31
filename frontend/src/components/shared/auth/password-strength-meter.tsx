"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number;
  labelKey: "weak" | "medium" | "fair" | "strong" | "veryStrong";
  color: string;
}

const SCORE_TO_KEY: Record<number, StrengthResult["labelKey"]> = {
  0: "weak",
  1: "weak",
  2: "medium",
  3: "fair",
  4: "strong",
  5: "veryStrong",
};

const SCORE_TO_COLOR: Record<number, string> = {
  0: "bg-destructive",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-warning",
  4: "bg-success",
  5: "bg-success",
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const t = useTranslations("auth.security.passwordStrength");

  const strength = useMemo((): StrengthResult => {
    if (!password) {
      return { score: 0, labelKey: "weak", color: "" };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;

    if (/(.)\1{2,}/.test(password)) score--;
    if (/^[a-z]+$/i.test(password)) score--;
    if (/^[0-9]+$/.test(password)) score--;

    score = Math.max(0, Math.min(5, score));

    return {
      score,
      labelKey: SCORE_TO_KEY[score] ?? "weak",
      color: SCORE_TO_COLOR[score] ?? "bg-destructive",
    };
  }, [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div
        className="flex gap-1"
        // oxlint-disable-next-line react-doctor/prefer-tag-over-role -- Multi-segment visual meter cannot be represented by a single native progress bar.
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={strength.score}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength.score ? strength.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p
        aria-live="polite"
        className={`text-xs ${
          strength.score <= 1
            ? "text-destructive"
            : strength.score <= 3
            ? "text-warning"
            : "text-success"
        }`}
      >
        {t(strength.labelKey)}
      </p>
    </div>
  );
}
