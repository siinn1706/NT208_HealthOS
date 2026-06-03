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
import { useChatWs, type WsFrame } from "@/hooks/useChatWs";
import { CHAT_REALTIME_EVENT, dispatchChatUnreadRefresh } from "@/hooks/useChat";
import {
  VITALS_REALTIME_EVENT,
  VITALS_REALTIME_RECONNECT_EVENT,
} from "@/hooks/useVitalsRealtimeRefresh";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
}

const SIDEBAR_PREFERENCE_KEY = "healthos.sidebar.collapsed";
const NOTIFICATIONS_REFRESH_EVENT = "healthos:notifications-refresh";
const CHAT_UNREAD_WS_EVENTS = new Set([
  "msg:new",
  "msg:read",
  "chat.message.sent",
  "chat.message.read",
  "conversation.updated",
  "chat.conversation.updated",
]);
const NOTIFICATION_WS_EVENTS = new Set([
  "notification.created",
  "notification.read",
  "notifications.read_all",
]);
const VITALS_WS_EVENTS = new Set(["vitals.updated"]);
const MOBILE_NAV_HEIGHT = "calc(5.25rem + env(safe-area-inset-bottom, 0px))";

function dispatchNotificationsRefresh(): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
}

function dispatchVitalsRefresh(frame: WsFrame): void {
  window.dispatchEvent(new CustomEvent(VITALS_REALTIME_EVENT, { detail: frame }));
}

function dispatchVitalsReconnectRefresh(): void {
  window.dispatchEvent(new CustomEvent(VITALS_REALTIME_RECONNECT_EVENT));
}

function DashboardRealtimeBridge() {
  const dispatchReconnectRefresh = React.useCallback(() => {
    dispatchChatUnreadRefresh();
    dispatchNotificationsRefresh();
    dispatchVitalsReconnectRefresh();
  }, []);

  const handleEvent = React.useCallback((frame: WsFrame) => {
    if (CHAT_UNREAD_WS_EVENTS.has(frame.event)) {
      window.dispatchEvent(new CustomEvent(CHAT_REALTIME_EVENT, { detail: frame }));
      dispatchChatUnreadRefresh();
    }
    if (NOTIFICATION_WS_EVENTS.has(frame.event)) {
      dispatchNotificationsRefresh();
    }
    if (VITALS_WS_EVENTS.has(frame.event)) {
      dispatchVitalsRefresh(frame);
    }
  }, []);

  useChatWs({
    onEvent: handleEvent,
    onReconnect: dispatchReconnectRefresh,
  });

  return null;
}

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
    let nextCollapsed = false;
    try {
      const raw = window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
      nextCollapsed = raw === "1";
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(() => {
      setCollapsed(nextCollapsed);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
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
    const id = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const isFullHeight = pathname.includes("/dashboard/chat");
  const shellStyle = {
    "--dashboard-mobile-nav-height": MOBILE_NAV_HEIGHT,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-svh w-full bg-background" style={shellStyle}>
      <DashboardRealtimeBridge />
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
            "min-h-0",
            isFullHeight
              // On mobile: flex-none + explicit height so the fixed MobileNav doesn't overlap
              // the MessageInput. flex-1 (flex-grow:1) would expand past the explicit height
              // and push content behind the nav. On desktop (md:) no MobileNav exists so
              // flex-1 is correct.
              ? "flex-none h-[calc(100svh_-_3.5rem_-_var(--dashboard-mobile-nav-height))] md:flex-1 md:h-[calc(100svh_-_3.5rem)] overflow-hidden"
              : "flex-1 overflow-x-hidden pb-[var(--dashboard-mobile-nav-height)] md:pb-0",
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
}
