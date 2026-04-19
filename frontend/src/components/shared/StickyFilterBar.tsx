"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterPill {
  id: string;
  label: string;
  /** Optional count badge ("12") shown after the label. */
  count?: number;
}

interface StickyFilterBarProps {
  pills: FilterPill[];
  activePillId: string;
  onPillChange: (id: string) => void;
  /** When provided, a search input is rendered to the left of the pills row. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Visually-hidden label for screen readers. */
    ariaLabel: string;
  };
  /** Optional summary string shown to the right (e.g. "12 articles"). */
  resultSummary?: string;
  /** Top offset to clear the navbar — defaults to standard `top-16 md:top-20`. */
  topOffsetClassName?: string;
  className?: string;
}

/**
 * Sticky search + pill-filter bar shared by Articles (and reusable
 * for other listing pages). Mirrors the in-place "category filter"
 * row but adds optional search + result-summary slots, while staying
 * a single horizontal strip on mobile.
 *
 * - Search is debounced by the caller; this component is purely controlled.
 * - Pills wrap on small screens; container scrolls vertically with the page.
 * - z-index sits above content but below the navbar (40 vs navbar's 50).
 */
export function StickyFilterBar({
  pills,
  activePillId,
  onPillChange,
  search,
  resultSummary,
  topOffsetClassName = "top-16 md:top-20",
  className,
}: StickyFilterBarProps) {
  return (
    <section
      aria-label="Filter and search"
      className={cn(
        "sticky z-40 border-b border-border bg-background/95 py-3 backdrop-blur-md",
        topOffsetClassName,
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {search && (
            <label className="relative block w-full md:max-w-xs">
              <span className="sr-only">{search.ariaLabel}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder}
                className="block h-10 w-full rounded-full border border-border bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-night-400 focus:outline-none focus:ring-2 focus:ring-night-400/40"
              />
            </label>
          )}

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {pills.map((pill) => {
              const active = pill.id === activePillId;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => onPillChange(pill.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2",
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-transparent text-muted-foreground hover:border-night-400 hover:text-foreground"
                  )}
                >
                  <span>{pill.label}</span>
                  {typeof pill.count === "number" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] font-semibold leading-5",
                        active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {pill.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {resultSummary && (
            <p
              role="status"
              aria-live="polite"
              className="shrink-0 text-sm text-muted-foreground md:ml-auto"
            >
              {resultSummary}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
