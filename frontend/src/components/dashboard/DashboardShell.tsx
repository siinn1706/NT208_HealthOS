"use client";

import { useState } from "react";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  alertCount?: number;
}

export function DashboardShell({
  children,
  userName,
  alertCount = 0,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Pass down state but sidebar manages its own UI; we propagate for TopNav offset
  return (
    <>
      <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <TopNav
        sidebarCollapsed={collapsed}
        userName={userName}
        alertCount={alertCount}
      />
      <main
        className={cn(
          "min-h-screen pt-16",
          "transition-[margin-left] duration-300 ease-in-out",
          collapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </>
  );
}
