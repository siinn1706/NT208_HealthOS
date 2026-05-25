"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  status: string;
  className?: string;
}

type StatusConfig = {
  labelKey: "active" | "banned" | "deleted" | null;
  bg: string;
  text: string;
};

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case "active":
      return {
        labelKey: "active",
        bg: "bg-[var(--admin-status-success-soft)]",
        text: "text-[var(--admin-status-success)]",
      };
    case "banned":
      return {
        labelKey: "banned",
        bg: "bg-[var(--admin-status-danger-soft)]",
        text: "text-[var(--admin-status-danger)]",
      };
    case "deleted":
      return {
        labelKey: "deleted",
        bg: "bg-[var(--admin-surface-muted)]",
        text: "text-[var(--admin-fg-muted)]",
      };
    default:
      return {
        labelKey: null,
        bg: "bg-[var(--admin-status-info-soft)]",
        text: "text-[var(--admin-status-info)]",
      };
  }
}

/** Status badge using admin-status tokens — ≥4.5:1 contrast in both modes. */
export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const t = useTranslations("admin.users.statusFilter");
  const { labelKey, bg, text } = getStatusConfig(status);
  const label = labelKey ? t(labelKey) : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        bg,
        text,
        className,
      )}
    >
      {label}
    </span>
  );
}
