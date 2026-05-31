"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { RecentEvent } from "./RecentEventsPanel";

type Category = "all" | "auth" | "users" | "subscriptions" | "security";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "auth", label: "Auth" },
  { value: "users", label: "Users" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "security", label: "Security" },
];
const ACTIVITY_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function matchesCategory(event: RecentEvent, cat: Category): boolean {
  if (cat === "all") return true;
  const t = event.type.toLowerCase();
  return t.includes(cat) || (cat === "auth" && (t.includes("login") || t.includes("logout") || t.includes("token")));
}

function formatTimestamp(iso: string): string {
  try {
    return ACTIVITY_TIMESTAMP_FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ActivityFeedProps {
  events: RecentEvent[] | null | undefined;
  isLoading?: boolean;
  /** Maximum items to display. Default 50. */
  maxItems?: number;
}

/** Filterable activity feed replacing the plain RecentEventsPanel. */
export function ActivityFeed({ events, isLoading, maxItems = 50 }: ActivityFeedProps) {
  const [category, setCategory] = React.useState<Category>("all");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
        <div className="mb-3 h-4 w-40 motion-safe:animate-pulse rounded bg-[var(--admin-surface-muted)]" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 motion-safe:animate-pulse rounded bg-[var(--admin-surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!events) return null;

  const filtered = events
    .filter((e) => matchesCategory(e, category))
    .slice(0, maxItems);

  return (
    <section
      aria-labelledby="activity-feed-heading"
      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"
    >
      {/* Header + filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
        <h2
          id="activity-feed-heading"
          className="text-sm font-semibold text-[var(--admin-fg)]"
        >
          Recent Activity
        </h2>
        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">Filter by category</legend>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              aria-pressed={category === cat.value}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                "motion-safe:transition-colors motion-safe:duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]",
                category === cat.value
                  ? "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"
                  : "text-[var(--admin-fg-muted)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-fg)]",
              )}
            >
              {cat.label}
            </button>
          ))}
        </fieldset>
      </div>

      {/* Events list */}
      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--admin-fg-subtle)]">
          No events in this category.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--admin-divider)]" aria-label="Activity events">
          {filtered.map((event, idx) => (
            <li
              key={`${event.at}-${idx}`}
              className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 hover:bg-[var(--admin-surface-muted)] motion-safe:transition-colors motion-safe:duration-100"
            >
              <time
                dateTime={event.at}
                className="w-36 shrink-0 font-mono text-[11px] text-[var(--admin-fg-subtle)]"
              >
                {formatTimestamp(event.at)}
              </time>
              <span className="min-w-0 truncate text-sm font-medium text-[var(--admin-fg)]">
                {event.type.length > 64 ? event.type.slice(0, 64) : event.type}
              </span>
              {event.summary && (
                <span className="ml-auto shrink-0 text-xs text-[var(--admin-fg-muted)]">
                  {event.summary}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
