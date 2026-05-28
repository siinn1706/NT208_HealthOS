"use client";

/**
 * RecentEventsPanel.tsx
 *
 * Renders the recent admin/security events panel on the Admin Overview page.
 *
 * Loading state  → Skeleton placeholders for event rows.
 * null events    → renders nothing (panel is conditional on API field presence).
 * Success state  → at most 20 entries, each showing ISO 8601 timestamp and
 *                  event type truncated to 64 characters.
 *
 * Requirements: 6.3, 6.5
 */

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecentEvent {
  /** ISO 8601 timestamp string. */
  at: string;
  /** Event type identifier. Truncated to 64 chars on display. */
  type: string;
  /** Optional human-readable summary. */
  summary?: string;
}

export interface RecentEventsPanelProps {
  /**
   * Array of recent events from the API.
   * - null  → panel is not rendered (field absent from API response).
   * - []    → panel renders with an empty state message.
   */
  events: RecentEvent[] | null;
  /** When true, renders Skeleton placeholders. */
  isLoading: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum number of event entries to display (R6.3). */
const MAX_EVENTS = 20;

/** Maximum display length for the event type string (R6.3). */
const MAX_TYPE_LENGTH = 64;

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <li className="flex items-start gap-3 py-2">
      <Skeleton className="h-4 w-40 shrink-0" />
      <Skeleton className="h-4 w-32" />
    </li>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * RecentEventsPanel
 *
 * - isLoading=true  → renders skeleton rows inside the panel (R6.5)
 * - events=null     → renders nothing (panel is conditional) (R6.3)
 * - events present  → renders at most 20 entries with timestamp + type (R6.3)
 */
export function RecentEventsPanel({ events, isLoading }: RecentEventsPanelProps) {
  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Loading recent events">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border" aria-label="Loading recent events list">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  // ── Null → panel absent (R6.3) ─────────────────────────────────────────────
  if (events === null) {
    return null;
  }

  // ── Slice to at most 20 entries (R6.3) ────────────────────────────────────
  const visible = events.slice(0, MAX_EVENTS);

  return (
    <Card aria-label="Recent events">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No recent events.</p>
        ) : (
          <ul
            className="divide-y divide-border"
            aria-label="Recent events list"
          >
            {visible.map((event, index) => {
              // Truncate event type to 64 chars (R6.3)
              const displayType =
                event.type.length > MAX_TYPE_LENGTH
                  ? event.type.slice(0, MAX_TYPE_LENGTH)
                  : event.type;

              return (
                <li
                  key={`${event.at}-${index}`}
                  className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:gap-3"
                >
                  {/* ISO 8601 timestamp */}
                  <time
                    dateTime={event.at}
                    className="shrink-0 font-mono text-xs text-muted-foreground"
                  >
                    {event.at}
                  </time>

                  {/* Event type (truncated to 64 chars) */}
                  <span className="text-sm font-medium text-foreground">
                    {displayType}
                  </span>

                  {/* Optional summary */}
                  {event.summary && (
                    <span className="text-sm text-muted-foreground sm:ml-auto">
                      {event.summary}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
