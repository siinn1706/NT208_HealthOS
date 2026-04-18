"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { TopNav } from "@/components/dashboard/TopNav";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
  alertCount?: number;
}

export function DashboardShell({
  children,
  userName,
  userAvatar,
  alertCount = 0,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isFullHeight = pathname.includes("/dashboard/chat");

  // Pass down state but sidebar manages its own UI; we propagate for TopNav offset
  return (
    <>
      <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <TopNav
        sidebarCollapsed={collapsed}
        userName={userName}
        userAvatar={userAvatar}
        alertCount={alertCount}
      />
      <main
        className={cn(
          "mt-16 h-[calc(100dvh-4rem)] overflow-hidden",
          "transition-[margin-left] duration-300 ease-in-out",
          collapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        <div className={cn("h-full", isFullHeight ? "overflow-hidden" : "overflow-auto p-6")}>
          {children}
        </div>
      </main>
    </>
  );
}
