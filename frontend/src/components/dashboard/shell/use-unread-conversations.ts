"use client";

import { useEffect, useState } from "react";

/**
 * Polls the conversations endpoint for the total unread count. Returns 0 when
 * offline or on error so badges silently degrade rather than show stale data.
 */
export function useUnreadConversations(intervalMs = 30_000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/v1/conversations", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const convos: Array<{ unread_count?: number }> = json?.data ?? [];
        const sum = convos.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
        if (!cancelled) setCount(sum);
      } catch {
        /* ignore */
      }
    };
    fetchUnread();
    const id = window.setInterval(fetchUnread, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return count;
}
