"use client";

import { useTranslations, useLocale } from "next-intl";
import { Bell, Search, ChevronDown, LogOut, User, Globe } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopNavProps {
  sidebarCollapsed?: boolean;
  userName?: string;
  userAvatar?: string;
  alertCount?: number;
}

const LOCALES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
];

export function TopNav({
  sidebarCollapsed = false,
  userName = "Nguyễn Văn A",
  alertCount = 0,
}: TopNavProps) {
  const t = useTranslations("dashboard.topnav");
  const locale = useLocale();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const switchLocale = (newLocale: string) => {
    router.push(`/${newLocale}/dashboard`);
    setLangOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16",
        "flex items-center gap-4 px-6",
        "bg-card border-b border-border",
        "transition-[left] duration-300 ease-in-out",
        sidebarCollapsed ? "left-[64px]" : "left-[240px]"
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className={cn(
              "w-full h-9 pl-9 pr-4 text-sm rounded-lg",
              "bg-muted text-foreground placeholder:text-muted-foreground",
              "border border-border",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "transition-colors duration-200"
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setLangOpen((v) => !v);
              setNotifOpen(false);
              setProfileOpen(false);
            }}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "border border-border transition-colors duration-200 cursor-pointer"
            )}
            aria-label="Switch language"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{locale}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm",
                    "hover:bg-muted transition-colors duration-200 cursor-pointer",
                    locale === l.code
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
              setLangOpen(false);
            }}
            aria-label={t("notifications")}
            className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "border border-border transition-colors duration-200 cursor-pointer"
            )}
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-1 w-72 rounded-lg bg-card border border-border shadow-lg z-50 p-4">
              <p className="text-sm font-semibold text-foreground mb-1">
                {t("notifications")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("noNotifications")}
              </p>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
              setLangOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg",
              "hover:bg-muted border border-border",
              "transition-colors duration-200 cursor-pointer"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50">
              <Link
                href={`/${locale}/dashboard/profile`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors duration-200"
                onClick={() => setProfileOpen(false)}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                {t("profile")}
              </Link>
              <div className="border-t border-border" />
              <Link
                href={`/${locale}/login`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors duration-200"
                onClick={() => setProfileOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                {t("signOut")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
