"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { useRouter } from "@/navigation";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StateView } from "@/components/shared/state";

const PAGE_SIZE = 25;

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind?: string | null;
  reference_id?: string | null;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

type ListEnvelope = {
  data?: NotificationItem[];
  meta?: { next_cursor?: string | null; has_more?: boolean; per_page?: number };
};

function relativeTime(iso: string, locale: string): string {
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

export default function NotificationsAllPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const tShell = useTranslations("dashboard.shell");
  const tPage = useTranslations("dashboard.notificationsPage");
  const router = useRouter();
  const [locale, setLocale] = React.useState<string>("en");
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then((p) => setLocale(p.locale));
  }, [params]);

  const loadPage = React.useCallback(
    async (pageCursor: string | null, append: boolean) => {
      const setBusy = append ? setLoadingMore : setLoading;
      setBusy(true);
      setError(null);
      try {
        const url = new URL("/api/v1/notifications", window.location.origin);
        url.searchParams.set("per_page", String(PAGE_SIZE));
        if (pageCursor) url.searchParams.set("cursor", pageCursor);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          setError(tShell("notificationsLoadError"));
          return;
        }
        const json = (await res.json().catch(() => null)) as ListEnvelope | null;
        const list = Array.isArray(json?.data) ? json.data : [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setCursor(json?.meta?.next_cursor ?? null);
        setHasMore(Boolean(json?.meta?.has_more));
      } catch {
        setError(tShell("notificationsLoadError"));
      } finally {
        setBusy(false);
      }
    },
    [tShell],
  );

  React.useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  const handleClick = React.useCallback(
    async (n: NotificationItem) => {
      if (!n.is_read) {
        // Optimistic update + persist.
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x)),
        );
        try {
          await fetch(`/api/v1/notifications/${n.id}/read`, { method: "POST" });
        } catch {
          /* tolerate */
        }
      }
      const dest = n.link;
      if (dest && dest.startsWith("/")) router.push(dest);
      else if (dest) window.location.assign(dest);
    },
    [router],
  );

  const handleMarkAllRead = React.useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
    } catch {
      /* tolerate */
    }
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={tPage("title")}
        description={tPage("subtitle")}
        primaryAction={
          unread > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
              {tShell("notificationsMarkAllRead")}
            </Button>
          ) : null
        }
      />
      <div className="px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <StateView
            kind="error"
            density="section"
            title={error}
            primaryAction={{
              label: tShell("notificationsRetry"),
              onClick: () => void loadPage(null, false),
              variant: "outline",
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            kind="empty-first-use"
            density="section"
            title={tPage("empty")}
            icon={<Bell className="size-6" aria-hidden="true" />}
          />
        ) : (
          <ul role="list" className="divide-y divide-border rounded-md border border-border bg-card">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted",
                    !n.is_read && "bg-primary/5",
                  )}
                >
                  <div className="flex w-full items-start gap-3">
                    {!n.is_read && (
                      <span aria-hidden="true" className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(n.created_at, locale)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadPage(cursor, true)}
            >
              {loadingMore ? tPage("loadingMore") : tPage("loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
