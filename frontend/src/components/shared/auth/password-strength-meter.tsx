"use client";

import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
  locale?: string; // Currently only Vietnamese supported
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
}

export function PasswordStrengthMeter({
  password,
  locale = "vi",
}: PasswordStrengthMeterProps) {
  const strength = useMemo((): StrengthResult => {
    if (!password) {
      return { score: 0, label: "", color: "" };
    }

    let score = 0;

    // Length scoring
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character diversity
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;

    // Penalties
    if (/(.)\1{2,}/.test(password)) score--; // Repeated chars
    if (/^[a-z]+$/i.test(password)) score--; // Only letters
    if (/^[0-9]+$/.test(password)) score--; // Only numbers

    score = Math.max(0, Math.min(5, score));

    const levels: Record<number, { label: string; color: string }> = {
      0: { label: "Yếu", color: "bg-red-500" },
      1: { label: "Yếu", color: "bg-red-500" },
      2: { label: "Trung bình", color: "bg-yellow-500" },
      3: { label: "Khá", color: "bg-yellow-500" },
      4: { label: "Mạnh", color: "bg-green-500" },
      5: { label: "Rất mạnh", color: "bg-green-600" },
    };

    return {
      score,
      label: levels[score]?.label || "Yếu",
      color: levels[score]?.color || "bg-red-500",
    };
  }, [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs ${
          strength.score <= 1
            ? "text-red-500"
            : strength.score <= 2
            ? "text-yellow-500"
            : "text-green-500"
        }`}
      >
        {strength.label}
      </p>
    </div>
  );
}
