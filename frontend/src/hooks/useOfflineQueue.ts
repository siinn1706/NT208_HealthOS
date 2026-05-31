"use client";

import * as React from "react";
import {
  enqueue as enqueueEntry,
  flush as flushQueue,
  getQueue,
  remove,
  setScope as setQueueScope,
  subscribe,
  type EnqueueInput,
  type QueueEntry,
  type FlushOptions,
} from "@/lib/offline-queue";
import { useConnection } from "@/components/providers/offline-provider";
import { resolveAuthUserId } from "@/lib/user-scoped-storage";

/**
 * React adapter around the offline mutation queue. Exposes the live queue
 * snapshot, enqueue/remove helpers, and an auto-flush effect that drains the
 * queue whenever the connection transitions back to "online".
 *
 * Callers responsible for actually wiring this into mutation paths (e.g. meal
 * logging) should:
 *   1. On submit, try the request directly via `bffFetchClient`.
 *   2. If the network fails AND `connection.status !== "online"`, call
 *      `queue.enqueue({ url, method, body, label })` and show an
 *      `InlineNotice` saying "Saved locally — will sync when back online".
 *   3. The auto-flush will replay it transparently.
 *
 * This keeps the call-site code shape unchanged for the happy path.
 */
export interface UseOfflineQueueResult {
  entries: QueueEntry[];
  pendingCount: number;
  enqueue: (input: EnqueueInput) => QueueEntry;
  remove: (id: string) => void;
  flushNow: (opts?: FlushOptions) => Promise<number>;
}

export function useOfflineQueue(opts: FlushOptions = {}): UseOfflineQueueResult {
  const [entries, setEntries] = React.useState<QueueEntry[]>([]);
  const [scopeReady, setScopeReady] = React.useState(false);
  const { status } = useConnection();
  const optsRef = React.useRef(opts);
  React.useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  // Bind the underlying store to the authenticated user before any read/write
  // happens. Until this resolves the queue presents as empty, preventing
  // cross-user data leakage on shared devices.
  React.useEffect(() => {
    let cancelled = false;
    void resolveAuthUserId().then((uid) => {
      if (cancelled) return;
      setQueueScope(uid);
      setScopeReady(true);
      setEntries(getQueue());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!scopeReady) return;
    return subscribe((next) => setEntries(next));
  }, [scopeReady]);

  React.useEffect(() => {
    if (!scopeReady) return;
    if (status !== "online") return;
    if (entries.length === 0) return;
    void flushQueue(optsRef.current);
  }, [scopeReady, status, entries.length]);

  const enqueueCb = React.useCallback((input: EnqueueInput) => {
    return enqueueEntry(input);
  }, []);

  const removeCb = React.useCallback((id: string) => {
    remove(id);
  }, []);

  const flushNow = React.useCallback(
    (callOpts?: FlushOptions) => flushQueue(callOpts ?? optsRef.current),
    [],
  );

  return {
    entries,
    pendingCount: entries.length,
    enqueue: enqueueCb,
    remove: removeCb,
    flushNow,
  };
}
