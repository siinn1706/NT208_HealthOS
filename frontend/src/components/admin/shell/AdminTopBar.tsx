"use client";

import * as React from "react";
import { AdminIdentityMenu } from "./AdminIdentityMenu";
import { AdminBreadcrumb } from "./AdminBreadcrumb";

export interface AdminTopBarProps {
  displayName: string | null;
  avatarUrl: string | null;
}

export function AdminTopBar({ displayName, avatarUrl }: AdminTopBarProps) {
  return (
    <header
      style={{ height: "var(--admin-header-height)", boxShadow: "var(--admin-header-shadow)" }}
      className="flex w-full shrink-0 items-center justify-between gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4"
    >
      {/* Left: breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center">
        <AdminBreadcrumb />
      </div>

      {/* Right: command-K placeholder + identity */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Command-K placeholder — slot reserved for future shortcut */}
        <kbd
          aria-label="Press Ctrl+K or Cmd+K to search"
          className="hidden items-center gap-1 rounded border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] px-2 py-1 text-[11px] text-[var(--admin-fg-muted)] md:flex"
        >
          <span className="text-xs">⌘</span>K
        </kbd>

        <AdminIdentityMenu displayName={displayName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
