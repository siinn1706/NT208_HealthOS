// admin-page-header.tsx — standardized admin page header with optional actions slot

import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, menus, etc.). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standard admin page header: title + description + optional right-aligned actions.
 * Use inside `AdminPageContent` or any `p-6` container.
 */
export function AdminPageHeader({ title, description, children, className }: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-fg)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--admin-fg-muted)]">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
