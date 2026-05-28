import * as React from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

export interface AdminShellProps {
  displayName: string | null;
  avatarUrl: string | null;
  children: React.ReactNode;
}

export function AdminShell({ displayName, avatarUrl, children }: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip-to-main link — visually hidden until focused */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--admin-brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--admin-on-brand)] focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar displayName={displayName} avatarUrl={avatarUrl} />

        <main
          id="admin-main-content"
          className="flex-1 overflow-y-auto min-w-0 bg-[var(--admin-canvas)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
