"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  UtensilsCrossed,
  Activity,
  Bell,
  Target,
  MessageCircle,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Trophy,
  Medal,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { key: "overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "profile", icon: User, href: "/dashboard/profile" },
  { key: "nutrition", icon: UtensilsCrossed, href: "/dashboard/meals" },
  { key: "vitalsDevices", icon: Activity, href: "/dashboard/health" },
  { key: "reminders", icon: Bell, href: "/dashboard/reminders" },
  { key: "goals", icon: Target, href: "/dashboard/progress" },
  { key: "achievements", icon: Trophy, href: "/dashboard/achievements" },
  { key: "leaderboard", icon: Medal, href: "/dashboard/leaderboard" },
  { key: "chat", icon: MessageCircle, href: "/dashboard/chat" },
  { key: "reports", icon: FileBarChart2, href: "/dashboard/reports" },
  { key: "settings", icon: Settings, href: "/dashboard/settings" },
] as const;

interface SidebarNavProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SidebarNav({ collapsed: collapsedProp, onToggle }: SidebarNavProps = {}) {
  const t = useTranslations("dashboard.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Support both controlled (from DashboardShell) and uncontrolled modes
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const handleToggle = onToggle ?? (() => setInternalCollapsed((c) => !c));

  // Fetch real unread count from BFF
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/v1/conversations", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const convos: Array<{ unread_count?: number }> = json?.data ?? [];
          const sum = convos.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
          setTotalUnread(sum);
        }
      } catch {
        // ignore — badge stays 0 if offline
      }
    };
    fetchUnread();
    // Poll every 30 s while the sidebar is mounted
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen z-40 flex flex-col",
        "bg-[#0F2743] border-r border-[rgba(65,188,230,0.15)]",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-[rgba(65,188,230,0.15)]",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1965B3] flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-[#6DE7F7]" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-lg tracking-tight">
            HealthOS
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ key, icon: Icon, href }) => {
            const fullHref = `/${locale}${href}`;
            const isActive =
              key === "overview"
                ? pathname === fullHref || pathname === `/${locale}/dashboard`
                : pathname.startsWith(fullHref);

            return (
              <li key={key}>
                <Link
                  href={fullHref}
                  title={t(key as Parameters<typeof t>[0])}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                    "text-sm font-medium",
                    "transition-colors duration-200",
                    isActive
                      ? "bg-[#1965B3] text-white"
                      : "text-[#75A2B9] hover:bg-[#1A4474] hover:text-white",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <span className="relative flex-shrink-0">
                    <Icon className="w-5 h-5" />
                    {key === "chat" && totalUnread > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#41BCE6] rounded-full" />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <span className="truncate">
                        {t(key as Parameters<typeof t>[0])}
                      </span>
                      {key === "chat" && totalUnread > 0 && (
                        <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[#41BCE6] text-[#0F2743] text-[10px] font-bold rounded-full flex items-center justify-center">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-center mx-auto mb-4",
          "w-8 h-8 rounded-full",
          "bg-[#1A4474] text-[#75A2B9] hover:text-white hover:bg-[#1965B3]",
          "transition-colors duration-200 cursor-pointer"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
