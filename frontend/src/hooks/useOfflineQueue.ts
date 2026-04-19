"use client";

import * as React from "react";
import {
  enqueue as enqueueEntry,
  flush as flushQueue,
  getQueue,
  remove,
  subscribe,
  type EnqueueInput,
  type QueueEntry,
  type FlushOptions,
} from "@/lib/offline-queue";
import { useConnection } from "@/components/providers/offline-provider";

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
  const [entries, setEntries] = React.useState<QueueEntry[]>(() => getQueue());
  const { status } = useConnection();
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  React.useEffect(() => {
    const initial = getQueue();
    if (initial.length !== entries.length) setEntries(initial);
    return subscribe((next) => setEntries(next));
    // We intentionally only sync from the store; the comparison above guards
    // against React re-render storms during fast double-mounts in dev.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (status !== "online") return;
    if (entries.length === 0) return;
    void flushQueue(optsRef.current);
  }, [status, entries.length]);

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
