"use client";

// audit-toolbar.tsx — filter bar for the audit log page (state-only, no fetch)

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AuditFilters {
  from: string;
  to: string;
  actor: string;
  eventType: string;
}

interface AuditToolbarProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

function update(filters: AuditFilters, key: keyof AuditFilters, value: string): AuditFilters {
  return { ...filters, [key]: value };
}

/** Filter bar: date range · actor · event type · export (disabled placeholder). */
export function AuditToolbar({ filters, onChange }: AuditToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => onChange(update(filters, "from", e.target.value))}
          aria-label="From date"
          className="w-36 text-sm"
        />
        <span className="select-none text-[var(--admin-fg-muted)]">–</span>
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => onChange(update(filters, "to", e.target.value))}
          aria-label="To date"
          className="w-36 text-sm"
        />
      </div>

      {/* Actor filter */}
      <Input
        value={filters.actor}
        onChange={(e) => onChange(update(filters, "actor", e.target.value))}
        placeholder="Actor (email or ID)"
        aria-label="Filter by actor"
        className="w-48 text-sm"
      />

      {/* Event type filter */}
      <Input
        value={filters.eventType}
        onChange={(e) => onChange(update(filters, "eventType", e.target.value))}
        placeholder="Event type"
        aria-label="Filter by event type"
        className="w-40 text-sm"
      />

      {/* Export — disabled placeholder */}
      <div className="ml-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-disabled="true"
                  className="border-[var(--admin-border)] text-[var(--admin-fg-muted)]"
                >
                  Export
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Export coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
