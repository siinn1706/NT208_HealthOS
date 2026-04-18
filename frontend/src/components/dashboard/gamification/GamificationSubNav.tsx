"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Target, Trophy, Medal } from "lucide-react";

const TAB_KEYS = [
  { key: "progress", href: "/dashboard/progress", icon: Target, labelKey: "goals" },
  { key: "achievements", href: "/dashboard/achievements", icon: Trophy, labelKey: "achievements" },
  { key: "leaderboard", href: "/dashboard/leaderboard", icon: Medal, labelKey: "leaderboard" },
] as const;

export function GamificationSubNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("dashboard.gamification.tabs");

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
      {TAB_KEYS.map(({ key, href, icon: Icon, labelKey }) => {
        const fullHref = `/${locale}${href}`;
        const isActive = pathname.startsWith(fullHref);
        return (
          <Link
            key={key}
            href={fullHref}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-[#1965B3] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}
