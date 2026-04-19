"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNavGrouped } from "./SidebarNavGrouped";
import { TopNavV2 } from "./TopNavV2";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
}

const SIDEBAR_PREFERENCE_KEY = "healthos.sidebar.collapsed";

/**
 * Single source of truth for the authenticated app chrome.
 * Renders desktop sidebar + sticky top nav, a mobile bottom-tab bar,
 * and an off-canvas drawer that exposes the full sidebar on small screens.
 */
export function AppShell({ children, userName, userAvatar }: AppShellProps) {
  const pathname = usePathname();
  const tShell = useTranslations("dashboard.shell");

  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isFullHeight = pathname.includes("/dashboard/chat");

  return (
    <div className="flex min-h-svh w-full bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:ring-2 focus:ring-ring"
      >
        {tShell("skipToMain")}
      </a>
      <div className="hidden md:block">
        <div className="sticky top-0 h-svh">
          <SidebarNavGrouped
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[260px] border-0 bg-sidebar p-0 text-sidebar-foreground sm:max-w-[260px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{tShell("openDrawer")}</SheetTitle>
            <SheetDescription>{tShell("openDrawer")}</SheetDescription>
          </SheetHeader>
          <div className="h-full">
            <SidebarNavGrouped
              forceExpanded
              hideCollapseToggle
              onLinkClick={() => setDrawerOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavV2
          userName={userName}
          userAvatar={userAvatar}
          onOpenMobileNav={() => setDrawerOpen(true)}
        />
        <main
          id="main"
          className={cn(
            "flex-1",
            isFullHeight
              ? "h-[calc(100svh-3.5rem)] overflow-hidden"
              : "overflow-x-hidden pb-16 md:pb-0",
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
}
