import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrustItem {
  id: string;
  /** Big number / metric (e.g. "10k+"). */
  value: string;
  /** Short label below the number. */
  label: string;
  icon?: LucideIcon;
}

interface TrustStripProps {
  items: TrustItem[];
  /** Visual tone — defaults to muted card on light bg. */
  tone?: "card" | "dark";
  className?: string;
}

/**
 * Compact at-a-glance metric strip.
 * - Server-only, zero JS.
 * - Used by About to lift social-proof above the fold without
 *   relying on full testimonial cards.
 */
export function TrustStrip({ items, tone = "card", className }: TrustStripProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-4 sm:gap-6 sm:p-6",
        tone === "dark"
          ? "border-white/10 bg-white/5 text-white"
          : "border-border bg-card text-foreground",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.id}
            className="flex flex-col items-center justify-center text-center sm:items-start sm:text-left"
          >
            {Icon && (
              <span
                className={cn(
                  "mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                  tone === "dark"
                    ? "bg-white/10 text-night-300"
                    : "bg-gradient-to-br from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <span className="text-2xl font-extrabold sm:text-3xl">{item.value}</span>
            <span
              className={cn(
                "text-xs sm:text-sm",
                tone === "dark" ? "text-night-100/70" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
