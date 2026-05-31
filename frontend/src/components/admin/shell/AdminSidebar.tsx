"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShieldAlert,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { ADMIN_SECURITY_FEED_ENABLED, ADMIN_AUDIT_FEED_ENABLED } from "@/lib/env";
import { stripLocale } from "@/lib/admin/path-classify";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
} from "./admin-sidebar-collapse";
import { AdminEnvBadge } from "./AdminEnvBadge";

// ── Types ────────────────────────────────────────────────────────────────────
const SIDEBAR_COLLAPSE_EVENT = "healthos:admin-sidebar-collapse";

function subscribeSidebarCollapse(onStoreChange: () => void) {
  window.addEventListener(SIDEBAR_COLLAPSE_EVENT, onStoreChange);
  return () => window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, onStoreChange);
}

function getServerSidebarCollapsed() {
  return false;
}

interface NavEntry {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  heading: string;
  entries: NavEntry[];
}

// ── Error boundary ───────────────────────────────────────────────────────────

interface NavLinkErrorBoundaryProps {
  label: string;
  children: React.ReactNode;
}

class NavLinkErrorBoundary extends React.Component<
  NavLinkErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: NavLinkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) {
    toast.error(`Could not open ${this.props.label}`, {
      description: error instanceof Error ? error.message : "Navigation failed.",
    });
    this.setState({ hasError: false });
  }
  render() { return this.props.children; }
}

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  entry,
  isActive,
  collapsed,
}: {
  entry: NavEntry;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = entry.icon;

  return (
    <NavLinkErrorBoundary label={entry.label}>
      <Link
        href={entry.href}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? entry.label : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
          "motion-safe:transition-colors motion-safe:duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-sidebar-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--admin-sidebar-bg)]",
          "text-[var(--admin-sidebar-fg-muted)] hover:bg-[var(--admin-sidebar-hover)] hover:text-[var(--admin-sidebar-fg)]",
          isActive && [
            "bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-fg)]",
            "border-l-2 border-[var(--admin-sidebar-accent)]",
            "pl-[calc(0.625rem-2px)]",
          ],
          collapsed && "justify-center px-2",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            isActive
              ? "text-[var(--admin-sidebar-accent)]"
              : "text-[var(--admin-sidebar-fg-muted)] group-hover:text-[var(--admin-sidebar-fg)]",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{entry.label}</span>}
      </Link>
    </NavLinkErrorBoundary>
  );
}

// ── AdminSidebar ─────────────────────────────────────────────────────────────

export interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const pathnameWithoutLocale = stripLocale(pathname, routing.locales);
  const t = useTranslations("admin.shell");

  const collapsed = React.useSyncExternalStore(
    subscribeSidebarCollapse,
    getSidebarCollapsed,
    getServerSidebarCollapsed,
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setSidebarCollapsed(next);
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSE_EVENT));
  }

  // Build nav groups
  const groups: NavGroup[] = [
    {
      heading: t("groups.operations"),
      entries: [
        { label: t("nav.overview"), href: "/admin", icon: LayoutDashboard },
        { label: t("nav.users"), href: "/admin/users", icon: Users },
      ],
    },
    {
      heading: t("groups.subscriptions"),
      entries: [
        { label: t("nav.plans"), href: "/admin/subscriptions", icon: CreditCard },
      ],
    },
    {
      heading: t("groups.trustSafety"),
      entries: [
        ...(ADMIN_SECURITY_FEED_ENABLED
          ? [{ label: t("nav.security"), href: "/admin/security", icon: ShieldAlert }]
          : []),
        ...(ADMIN_AUDIT_FEED_ENABLED
          ? [{ label: t("nav.audit"), href: "/admin/audit", icon: ClipboardList }]
          : []),
      ],
    },
  ].filter((g) => g.entries.length > 0);

  function isActive(entry: NavEntry): boolean {
    const clean = pathnameWithoutLocale.replace(/\/+$/, "") || "/";
    if (entry.href === "/admin") return clean === "/admin";
    return clean === entry.href || clean.startsWith(entry.href + "/");
  }

  return (
    <aside
      aria-label="Admin navigation"
      className={cn(
        "flex h-full shrink-0 flex-col bg-[var(--admin-sidebar-bg)]",
        "motion-safe:transition-[width] motion-safe:duration-200",
        collapsed ? "w-14" : "w-60",
        className,
      )}
    >
      {/* Brand + env badge */}
      <div className="flex h-[var(--admin-header-height)] items-center px-3 shrink-0">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-[var(--admin-sidebar-fg)] truncate">
            {t("title")}
            <AdminEnvBadge />
          </span>
        )}
        {collapsed && (
          <span className="mx-auto text-xs font-bold text-[var(--admin-sidebar-accent)]">
            AC
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {groups.map((group) => (
          <div key={group.heading}>
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--admin-sidebar-fg-muted)]">
                {group.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.entries.map((entry) => (
                <li key={entry.href}>
                  <NavItem
                    entry={entry}
                    isActive={isActive(entry)}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-[var(--admin-sidebar-hover)] px-2 py-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t("expand") : t("collapse")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium",
            "text-[var(--admin-sidebar-fg-muted)] hover:bg-[var(--admin-sidebar-hover)] hover:text-[var(--admin-sidebar-fg)]",
            "motion-safe:transition-colors motion-safe:duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-sidebar-accent)]",
            collapsed && "justify-center px-2",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
