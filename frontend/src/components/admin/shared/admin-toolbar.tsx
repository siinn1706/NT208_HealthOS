// admin-toolbar.tsx — horizontal flex container for toolbar rows

import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal flex container with consistent gap and wrap rules.
 * Use for filter bars, search + action rows, column-toggle rows, etc.
 */
export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  );
}
