"use client";

import * as React from "react";
import {
  enqueueMultipart as enqueueEntry,
  flushMultipart,
  getMultipartQueue,
  removeMultipart,
  subscribeMultipart,
  type EnqueueMultipartInput,
  type FlushMultipartOptions,
  type MultipartQueueEntry,
} from "@/lib/offline-queue-multipart";
import { useConnection } from "@/components/providers/offline-provider";

export interface UseMultipartOfflineQueueResult {
  entries: MultipartQueueEntry[];
  pendingCount: number;
  enqueue: (input: EnqueueMultipartInput) => Promise<MultipartQueueEntry>;
  remove: (id: string) => Promise<void>;
  flushNow: (opts?: FlushMultipartOptions) => Promise<number>;
}

/**
 * React adapter around the IndexedDB-backed multipart queue (B7 P7).
 *
 * Mirrors `useOfflineQueue` for the JSON queue. Auto-flushes when the
 * connection transitions back to "online" or when an entry is added. The
 * IndexedDB store is keyed by the entry's `idempotencyKey` so re-enqueuing
 * the same logical action is a no-op.
 */
export function useMultipartOfflineQueue(
  opts: FlushMultipartOptions = {},
): UseMultipartOfflineQueueResult {
  const [entries, setEntries] = React.useState<MultipartQueueEntry[]>([]);
  const { status } = useConnection();
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  React.useEffect(() => {
    let cancelled = false;
    void getMultipartQueue().then((initial) => {
      if (!cancelled) setEntries(initial);
    });
    const unsub = subscribeMultipart((next) => setEntries(next));
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  React.useEffect(() => {
    if (status !== "online") return;
    if (entries.length === 0) return;
    void flushMultipart(optsRef.current);
  }, [status, entries.length]);

  const enqueueCb = React.useCallback(async (input: EnqueueMultipartInput) => {
    return enqueueEntry(input);
  }, []);

  const removeCb = React.useCallback(async (id: string) => {
    await removeMultipart(id);
  }, []);

  const flushNow = React.useCallback(
    (callOpts?: FlushMultipartOptions) => flushMultipart(callOpts ?? optsRef.current),
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
