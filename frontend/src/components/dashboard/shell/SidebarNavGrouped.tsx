"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandMarkIcon, brandMarkGlassBadgeSurfaceClassName } from "@/components/shared/auth/primitives";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavLink } from "./nav-config";
import { useUnreadConversations } from "./use-unread-conversations";

export interface SidebarNavGroupedProps {
  collapsed?: boolean;
  onToggle?: () => void;
  /** When true, group headers and labels are forced visible regardless of `collapsed`. */
  forceExpanded?: boolean;
  /** Called when a link is clicked (used by the mobile drawer to close itself). */
  onLinkClick?: () => void;
  /** Hide the collapse toggle (used in mobile drawer). */
  hideCollapseToggle?: boolean;
  className?: string;
}

interface SidebarLinkProps {
  link: NavLink;
  isActive: boolean;
  collapsed: boolean;
  unreadCount: number;
  onClick?: () => void;
}

function SidebarLink({ link, isActive, collapsed, unreadCount, onClick }: SidebarLinkProps) {
  const t = useTranslations("dashboard.nav");
  const tCommon = useTranslations("comingSoon");
  const Icon = link.icon;
  const showBadge = !!link.hasUnreadBadge && unreadCount > 0;
  const label = t(link.key as Parameters<typeof t>[0]);

  return (
    <li>
      <Link
        href={link.href as never}
        title={label}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          link.comingSoon && !isActive && "opacity-70",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="relative flex-shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {showBadge && collapsed && (
            <span
              aria-label={`${unreadCount} unread`}
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
            />
          )}
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <span className="truncate">{label}</span>
            {link.comingSoon && (
              <span
                className="ml-auto rounded-full border border-sidebar-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                title={tCommon("title")}
              >
                {tCommon("title")}
              </span>
            )}
            {showBadge && !link.comingSoon && (
              <span className="ml-auto flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

export function SidebarNavGrouped({
  collapsed: collapsedProp,
  onToggle,
  forceExpanded,
  onLinkClick,
  hideCollapseToggle,
  className,
}: SidebarNavGroupedProps) {
  const t = useTranslations("dashboard.nav");
  const tGroups = useTranslations("dashboard.nav.groups");
  const locale = useLocale();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);

  const collapsedRaw =
    collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const collapsed = forceExpanded ? false : collapsedRaw;
  const handleToggle = onToggle ?? (() => setInternalCollapsed((c) => !c));
  const unread = useUnreadConversations();

  const isLinkActive = React.useCallback(
    (href: string) => {
      const fullHref = `/${locale}${href}`;
      if (href === "/dashboard") {
        return pathname === fullHref || pathname === `/${locale}/dashboard`;
      }
      return pathname.startsWith(fullHref);
    },
    [pathname, locale],
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        "border-r border-sidebar-border",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[240px]",
        className,
      )}
      aria-label={t("mainNavAriaLabel")}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-5",
          collapsed && "justify-center px-0",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
            brandMarkGlassBadgeSurfaceClassName,
          )}
        >
          <BrandMarkIcon className="h-5 w-5" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">HealthOS</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.key} className={cn(gi > 0 && "mt-3")}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tGroups(group.key as Parameters<typeof tGroups>[0])}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div
                aria-hidden="true"
                className="mx-3 mb-2 h-px bg-sidebar-border"
              />
            )}
            <ul className="space-y-1">
              {group.links.map((link) => (
                <SidebarLink
                  key={link.key}
                  link={link}
                  isActive={isLinkActive(link.href)}
                  collapsed={collapsed}
                  unreadCount={unread}
                  onClick={onLinkClick}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!hideCollapseToggle && (
        <button
          onClick={handleToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full",
            "bg-sidebar-accent text-muted-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground",
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </aside>
  );
}
