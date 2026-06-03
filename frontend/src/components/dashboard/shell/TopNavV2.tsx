"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/navigation";
import {
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OfflineIndicator } from "@/components/shared/state";
import { CommandPalette } from "./CommandPalette";
import { NotificationsPopover } from "./NotificationsPopover";
import { routing } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import { purgeAllUserScoped } from "@/lib/user-scoped-storage";

interface TopNavV2Props {
  userName?: string;
  userAvatar?: string;
  onOpenMobileNav?: () => void;
}

const LOCALES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
];

function isMacLike() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
}

export function TopNavV2({ userName, userAvatar, onOpenMobileNav }: TopNavV2Props) {
  const t = useTranslations("dashboard.topnav");
  const tShell = useTranslations("dashboard.shell");
  const tTheme = useTranslations("dashboard.settingsPage.appearance");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const displayName = userName?.trim() || t("profile");
  const [mac, setMac] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMac(isMacLike()), []);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    const localePattern = routing.locales.join("|");
    const path = window.location.pathname.replace(new RegExp(`^\\/(${localePattern})`), "");
    const search = window.location.search ?? "";
    router.push(`/${newLocale}${path}${search}`);
  };

  const onLogout = async () => {
    try {
      await fetch("/api/v1/auth/session", { method: "DELETE" });
      track("auth.logout.completed");
    } finally {
      // P0: wipe every `healthos.*` localStorage key + `healthos-chat-*`
      // IndexedDB so user-A's drafts/queues/cooldowns don't leak to user-B
      // on a shared device. Best-effort, capped at ~1.5s per IDB delete.
      try {
        await purgeAllUserScoped();
      } catch {
        /* never block logout on storage cleanup */
      }
      router.push(`/${locale}/login`);
    }
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:px-6",
        )}
      >
        {onOpenMobileNav && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpenMobileNav}
            aria-label={tShell("openDrawer")}
            className="size-11 md:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
          </Button>
        )}

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "group flex h-9 max-w-md flex-1 min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted",
          )}
          aria-label={tShell("commandPaletteTitle")}
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="truncate">{t("searchPlaceholder")}</span>
          <span
            className={cn(
              "ml-auto hidden items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground sm:inline-flex",
            )}
            aria-hidden="true"
          >
            {mac ? "⌘" : "Ctrl"} K
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <OfflineIndicator className="inline-flex" />

          <NotificationsPopover locale={locale} />

          <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={tShell("themeToggle")}
              >
                {!mounted ? (
                  <span className="size-4" aria-hidden="true" suppressHydrationWarning />
                ) : theme === "dark" ? (
                  <Moon className="size-4" aria-hidden="true" />
                ) : theme === "light" ? (
                  <Sun className="size-4" aria-hidden="true" />
                ) : (
                  <Monitor className="size-4" aria-hidden="true" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>{tTheme("theme")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={theme ?? "system"}
                onValueChange={(v) => {
                  setTheme(v);
                  track("shell.theme.changed", { theme: v });
                }}
              >
                <DropdownMenuRadioItem value="system">
                  <Monitor className="size-3.5" aria-hidden="true" />
                  {tTheme("themeSystem")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">
                  <Sun className="size-3.5" aria-hidden="true" />
                  {tTheme("themeLight")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="size-3.5" aria-hidden="true" />
                  {tTheme("themeDark")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-8 px-2 sm:inline-flex"
                aria-label="Switch language"
              >
                <Globe className="size-3.5" aria-hidden="true" />
                <span className="uppercase">{locale}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {LOCALES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className={cn(locale === l.code && "font-semibold text-primary")}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-2 px-2"
              >
                <Avatar className="size-6">
                  {userAvatar ? (
                    <AvatarImage src={userAvatar} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                    <User className="size-3.5" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:inline">
                  {displayName}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center gap-2">
                  <User className="size-4" aria-hidden="true" />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="size-4" aria-hidden="true" />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
