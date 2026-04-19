"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StateView } from "@/components/shared/state";
import { track } from "@/lib/analytics";

const MAX_ITEMS = 20;

type NotificationItem = {
  id: string | number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  href?: string | null;
};

const FETCH_INTERVAL_MS = 60_000;

function normalize(raw: unknown): NotificationItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as NotificationItem[];
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as NotificationItem[];
    if (Array.isArray(obj.results)) return obj.results as NotificationItem[];
  }
  return [];
}

function relativeTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.floor((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86_400), "day");
}

export function NotificationsPopover({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.topnav");
  const tShell = useTranslations("dashboard.shell");
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAll = React.useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/v1/notifications", { cache: "no-store" });
      if (!res.ok) {
        // Distinguish failure from "no notifications": surface a real error
        // state so the user knows their list may be incomplete.
        setError(tShell("notificationsLoadError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const list = normalize(json?.data ?? json);
      setItems(list);
    } catch {
      setError(tShell("notificationsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [tShell]);

  React.useEffect(() => {
    fetchAll();
    const id = window.setInterval(fetchAll, FETCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchAll]);

  const unreadCount = React.useMemo(
    () => items.filter((n) => !(n.is_read || n.read_at)).length,
    [items],
  );

  const visibleItems = React.useMemo(() => items.slice(0, MAX_ITEMS), [items]);
  const hasOverflow = items.length > MAX_ITEMS;

  const onTriggerClick = () => {
    if (!open) track("shell.notifications.opened", { unread: unreadCount });
  };

  const markRead = React.useCallback(async (id: string | number) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    );
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    } catch {
      /* keep optimistic update; server will reconcile on next poll */
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t("notifications")}
          className="relative"
          onClick={onTriggerClick}
        >
          {unreadCount > 0 ? (
            <BellRing className="size-4" aria-hidden="true" />
          ) : (
            <Bell className="size-4" aria-hidden="true" />
          )}
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
              aria-label={tShell("notificationsUnreadAria", { n: unreadCount })}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t("notifications")}</p>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {unreadCount > 0
              ? tShell("notificationsUnread", { n: unreadCount })
              : tShell("notificationsAllRead")}
          </span>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <StateView
              kind="error"
              density="section"
              title={error}
              primaryAction={{
                label: tShell("notificationsRetry"),
                onClick: () => {
                  setLoading(true);
                  fetchAll();
                },
                variant: "outline",
              }}
              className="m-3 border-0 bg-transparent p-3"
            />
          ) : items.length === 0 ? (
            <EmptyState
              kind="empty-first-use"
              density="section"
              title={t("noNotifications")}
              className="m-3 border-0 bg-transparent p-3"
            />
          ) : (
            <ul role="list" className="divide-y divide-border">
              {visibleItems.map((n) => {
                const unread = !(n.is_read || n.read_at);
                const titleText = n.title ?? tShell("notificationsDefaultTitle");
                const bodyText = n.message ?? n.body ?? "";
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (unread) markRead(n.id);
                        if (n.href) {
                          window.location.assign(n.href);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                        unread && "bg-primary/5",
                      )}
                    >
                      <div className="flex w-full items-start gap-2">
                        {unread && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {titleText}
                          </p>
                          {bodyText && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {bodyText}
                            </p>
                          )}
                        </div>
                        {n.created_at && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {relativeTime(n.created_at, locale)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && !error && hasOverflow && (
            <p className="border-t border-border px-3 py-2 text-center text-[11px] text-muted-foreground">
              {tShell("notificationsCapNotice", { n: MAX_ITEMS })}
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
