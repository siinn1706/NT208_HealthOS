// admin-page-content.tsx — standard vertical-rhythm wrapper for admin page bodies

import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminPageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard admin page content wrapper: flex-col gap-6 p-6 with min-w-0.
 * Eliminates duplicated layout patterns across page files.
 */
export function AdminPageContent({ children, className }: AdminPageContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-6 p-6", className)}>
      {children}
    </div>
  );
}
