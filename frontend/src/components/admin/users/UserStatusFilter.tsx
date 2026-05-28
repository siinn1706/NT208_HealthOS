"use client";

/**
 * UserStatusFilter.tsx
 *
 * A controlled select that lets admins filter the users list by account status.
 *
 * Props:
 *   - value: current filter value ("all" | "active" | "banned" | "deleted")
 *   - onChange: called with the new value when the selection changes
 *
 * Defaults to "all" on first load (the parent page is responsible for
 * initialising `value` to "all").
 *
 * Requirements: 7.2, 11.1, 11.2, 11.3, 11.4
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserStatusValue = "all" | "active" | "banned" | "deleted";

export interface UserStatusFilterProps {
  /** Currently selected status filter. */
  value: UserStatusValue;
  /** Called with the new value when the user changes the selection. */
  onChange: (v: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: UserStatusValue; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Banned" },
  { value: "deleted", label: "Deleted" },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UserStatusFilter
 *
 * Renders a labelled select control for filtering users by status.
 * The select is fully controlled — the parent owns the state.
 *
 * Validates: Requirements 7.2
 */
export function UserStatusFilter({ value, onChange }: UserStatusFilterProps) {
  const t = useTranslations("admin.users.statusFilter");
  const triggerId = React.useId();

  const STATUS_OPTIONS: { value: UserStatusValue; labelKey: "all" | "active" | "banned" | "deleted" }[] = [
    { value: "all",     labelKey: "all" },
    { value: "active",  labelKey: "active" },
    { value: "banned",  labelKey: "banned" },
    { value: "deleted", labelKey: "deleted" },
  ];

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={triggerId} className="text-sm text-muted-foreground whitespace-nowrap">
        Status
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={triggerId} size="sm" className="w-[140px]">
          <SelectValue placeholder={t("all")} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
