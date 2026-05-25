// admin-card.tsx — tokenized panel surface for admin pages

import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  /** Forward additional HTML div attributes (e.g. aria-label, role). */
  [key: string]: unknown;
}

/**
 * Tokenized panel surface: surface background, border, rounded-xl, p-4.
 * Use instead of inline `bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl`.
 */
export function AdminCard({ children, className, ...props }: AdminCardProps) {
  const { ...rest } = props;
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm",
        className,
      )}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
}
