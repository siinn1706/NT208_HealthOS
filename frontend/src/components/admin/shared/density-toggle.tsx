"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type Density, getDensity, saveDensity } from "@/lib/admin/ui-prefs";

export type { Density };
export { getDensity, saveDensity };

interface DensityToggleProps {
  value: Density;
  onChange: (d: Density) => void;
}

const OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

/** Segmented density toggle (Compact / Comfortable). */
export function DensityToggle({ value, onChange }: DensityToggleProps) {
  return (
    <div
      role="group"
      aria-label="Row density"
      className="flex items-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] p-0.5"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium",
            "motion-safe:transition-colors motion-safe:duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]",
            value === opt.value
              ? "bg-[var(--admin-surface)] text-[var(--admin-fg)] shadow-sm"
              : "text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
