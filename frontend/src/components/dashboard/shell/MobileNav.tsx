"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOBILE_NAV_LINKS } from "./nav-config";
import { useUnreadConversations } from "./use-unread-conversations";

interface MobileNavProps {
  onOpenDrawer?: () => void;
  className?: string;
}

/**
 * Bottom tab bar visible only on viewports < md. Includes a "More" trigger
 * that opens the full grouped sidebar in a Sheet drawer.
 */
export function MobileNav({ onOpenDrawer, className }: MobileNavProps) {
  const t = useTranslations("dashboard.nav");
  const tShell = useTranslations("dashboard.shell");
  const locale = useLocale();
  const pathname = usePathname();
  const unread = useUnreadConversations();

  const isActive = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/dashboard") {
      return pathname === fullHref || pathname === `/${locale}/dashboard`;
    }
    return pathname.startsWith(fullHref);
  };

  return (
    <nav
      aria-label={tShell("mobileNav")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      {MOBILE_NAV_LINKS.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.href);
        const showBadge = !!link.hasUnreadBadge && unread > 0;
        const label = t(link.key as Parameters<typeof t>[0]);
        return (
          <Link
            key={link.key}
            href={link.href as never}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 p-2 min-h-[44px] min-w-0 overflow-hidden text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden="true" />
              {showBadge && (
                <span
                  aria-label={tShell("notificationsUnreadAria", { n: unread })}
                  className="absolute -right-1.5 -top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={onOpenDrawer}
        className="flex min-h-[44px] flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none p-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
        aria-label={tShell("openDrawer")}
      >
        <Menu className="size-5" aria-hidden="true" />
        <span>{tShell("more")}</span>
      </Button>
    </nav>
  );
}
