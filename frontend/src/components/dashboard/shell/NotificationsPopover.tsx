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
import { useRouter } from "@/navigation";

const MAX_ITEMS = 20;
const NOTIFICATIONS_REFRESH_EVENT = "healthos:notifications-refresh";
const RELATIVE_TIME_FORMATTERS = {
  en: new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
  vi: new Intl.RelativeTimeFormat("vi", { numeric: "auto" }),
} as const;

type NotificationItem = {
  id: string | number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  /** Deep link from the server (`Notification.link`). */
  link?: string | null;
  /** Legacy alias kept for compatibility with older payloads. */
  href?: string | null;
};

// Popover refreshes every minute when open or focused; the cheaper
// unread-count poll backs the badge itself when the popover is closed.
const FETCH_INTERVAL_MS = 60_000;
const UNREAD_POLL_INTERVAL_MS = 30_000;

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

function readUnreadCount(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (data && typeof data === "object" && "unread" in data) {
    const value = (data as { unread?: unknown }).unread;
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  }
  return null;
}

/**
 * Validate a notification destination supplied by the server. Notifications
 * persist server-side and could carry hostile values either through a server
 * compromise or a malicious actor; we therefore refuse anything that is not
 * a same-origin path or a same-origin http(s) URL.
 *
 * Blocks `javascript:`, `data:`, `vbscript:`, scheme-relative `//evil.com`,
 * and any cross-origin URL.
 */
function isSafeNotificationDest(dest: string): boolean {
  if (typeof dest !== "string" || dest.length === 0) return false;
  // Reject scheme-relative URLs ("//evil.com") and obvious dangerous schemes
  // before parsing — `new URL("javascript:alert(1)", origin)` happily resolves
  // to the javascript URL with the host set to the page origin, which is the
  // exact case we need to defeat.
  const trimmed = dest.trim();
  if (trimmed.startsWith("//")) return false;
  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith("javascript:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("vbscript:") ||
    lowered.startsWith("file:")
  ) {
    return false;
  }

  // Path-relative (starts with `/` but not `//`) is always same-origin.
  if (trimmed.startsWith("/")) return true;

  // Absolute URL: require same-origin http(s).
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function readHasMore(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const meta = (json as { meta?: unknown }).meta;
  if (meta && typeof meta === "object" && "has_more" in meta) {
    return Boolean((meta as { has_more?: unknown }).has_more);
  }
  return false;
}

function relativeTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.floor((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = locale.startsWith("vi") ? RELATIVE_TIME_FORMATTERS.vi : RELATIVE_TIME_FORMATTERS.en;
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86_400), "day");
}

export function NotificationsPopover({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.topnav");
  const tShell = useTranslations("dashboard.shell");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Server-driven count (preferred); fall back to derived count if the
  // dedicated endpoint is unavailable on older deployments.
  const [serverUnreadCount, setServerUnreadCount] = React.useState<number | null>(null);
  const [hasMoreOnServer, setHasMoreOnServer] = React.useState<boolean>(false);

  const fetchUnreadCount = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/v1/notifications/unread-count", {
        cache: "no-store",
        signal,
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const count = readUnreadCount(json);
      if (count !== null) setServerUnreadCount(count);
    } catch {
      /* Badge poll is best-effort; popover open will refresh authoritatively. */
    }
  }, []);

  const fetchAll = React.useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/v1/notifications?per_page=${MAX_ITEMS}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        // Distinguish failure from "no notifications": surface a real error
        // state so the user knows their list may be incomplete.
        setError(tShell("notificationsLoadError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const list = normalize(json?.data ?? json);
      setItems(list);
      setHasMoreOnServer(readHasMore(json));
      // Refresh unread count from list view too (cheap; no extra round-trip).
      const unread = list.filter((n) => !(n.is_read || n.read_at)).length;
      setServerUnreadCount((prev) => (prev === null ? unread : prev));
    } catch {
      setError(tShell("notificationsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [tShell]);

  // Poll the cheap unread-count endpoint while the popover is closed.
  React.useEffect(() => {
    const controller = new AbortController();
    const tick = window.setTimeout(() => {
      void fetchUnreadCount(controller.signal);
    }, 0);
    const id = window.setInterval(() => {
      void fetchUnreadCount(controller.signal);
    }, UNREAD_POLL_INTERVAL_MS);
    const onFocus = () => {
      void fetchUnreadCount(controller.signal);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearTimeout(tick);
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchUnreadCount]);

  // Hydrate the full list when the popover opens, then refresh on interval.
  React.useEffect(() => {
    if (!open) return;
    const tick = window.setTimeout(() => {
      void fetchAll();
    }, 0);
    const id = window.setInterval(fetchAll, FETCH_INTERVAL_MS);
    return () => {
      window.clearTimeout(tick);
      window.clearInterval(id);
    };
  }, [open, fetchAll]);

  React.useEffect(() => {
    const refresh = () => {
      void fetchUnreadCount();
      if (open) void fetchAll();
    };
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, refresh);
  }, [fetchAll, fetchUnreadCount, open]);

  const derivedUnreadCount = React.useMemo(
    () => items.filter((n) => !(n.is_read || n.read_at)).length,
    [items],
  );
  const unreadCount = serverUnreadCount ?? derivedUnreadCount;

  const visibleItems = React.useMemo(() => items.slice(0, MAX_ITEMS), [items]);
  // The cap notice is shown when *either* the server says there are more
  // (cursor available) or we hit the local cap on a legacy non-paginated payload.
  const hasOverflow = hasMoreOnServer || items.length > MAX_ITEMS;

  const onTriggerClick = () => {
    if (!open) track("shell.notifications.opened", { unread: unreadCount });
  };

  const markRead = React.useCallback(async (id: string | number) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    );
    setServerUnreadCount((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    } catch {
      /* keep optimistic update; server will reconcile on next poll */
    } finally {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    if (unreadCount === 0) return;
    setItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
    );
    setServerUnreadCount(0);
    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
    } catch {
      /* optimistic update; reconciles on next poll */
    } finally {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
    }
  }, [unreadCount]);

  const handleNotificationClick = React.useCallback(
    (n: NotificationItem) => {
      const unread = !(n.is_read || n.read_at);
      if (unread) markRead(n.id);
      const dest = n.link ?? n.href;
      if (!dest) return;

      // P0: validate before navigating. A compromised notification could carry
      // `javascript:`, `data:`, or a cross-origin URL. Reject silently and log
      // for ops visibility.
      if (!isSafeNotificationDest(dest)) {
        let originForLog = "invalid";
        try {
          originForLog =
            typeof window !== "undefined"
              ? new URL(dest, window.location.origin).origin
              : "unknown";
        } catch {
          /* keep "invalid" */
        }
        track("shell.notifications.unsafe_href_blocked", { url_origin: originForLog });
        setOpen(false);
        return;
      }

      // Same-origin path → SPA navigation; same-origin absolute URL → hard link.
      if (dest.startsWith("/")) {
        router.push(dest);
      } else {
        window.location.assign(dest);
      }
      setOpen(false);
    },
    [markRead, router],
  );

  const handleSeeAll = React.useCallback(() => {
    router.push("/dashboard/notifications");
    setOpen(false);
  }, [router]);

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
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t("notifications")}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {unreadCount > 0
                ? tShell("notificationsUnread", { n: unreadCount })
                : tShell("notificationsAllRead")}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-medium text-primary underline-offset-2 hover:underline focus-visible:underline"
              >
                {tShell("notificationsMarkAllRead")}
              </button>
            )}
          </div>
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
            <ul className="divide-y divide-border">
              {visibleItems.map((n) => {
                const unread = !(n.is_read || n.read_at);
                const titleText = n.title ?? tShell("notificationsDefaultTitle");
                const bodyText = n.message ?? n.body ?? "";
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                        unread && "bg-primary/5",
                      )}
                    >
                      <div className="flex w-full items-start gap-2">
                        {unread && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary"
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
        {!loading && !error && items.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={handleSeeAll}
              className="block w-full rounded-md px-2 py-1.5 text-center text-xs font-medium text-primary hover:bg-muted focus-visible:bg-muted"
            >
              {tShell("notificationsSeeAll")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
