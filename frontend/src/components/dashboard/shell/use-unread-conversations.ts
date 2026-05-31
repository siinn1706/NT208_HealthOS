"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_UNREAD_REFRESH_EVENT } from "@/hooks/useChat";

/**
 * Polls the conversations endpoint for the total unread count. Returns 0 when
 * offline or on error so badges silently degrade rather than show stale data.
 */
export function useUnreadConversations(intervalMs = 30_000) {
  const [count, setCount] = useState(0);
  const intervalMsRef = useRef(intervalMs);

  useEffect(() => {
    intervalMsRef.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

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

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        void fetchUnread().finally(scheduleNext);
      }, intervalMsRef.current);
    };

    void fetchUnread();
    scheduleNext();
    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, fetchUnread);
    window.addEventListener("focus", fetchUnread);
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, fetchUnread);
      window.removeEventListener("focus", fetchUnread);
    };
  }, []);

  return count;
}
