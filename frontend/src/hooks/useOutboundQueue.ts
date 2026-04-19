"use client";

/**
 * useOutboundQueue — durable, per-conversation outbound queue for messages
 * that the user composed while offline (or that failed mid-send with a
 * `network` error). Backed by IndexedDB so the queue survives reload, tab
 * crashes, and accidental tab closes.
 *
 * Lifecycle:
 *   user sends -> useChat.sendMessage()
 *     -> POST succeeds: nothing here, message renders as `sent`
 *     -> POST fails (network/offline): caller invokes `enqueue(item)`
 *        and the message bubble renders with status `queued`
 *
 * On reconnect the consumer (ChatWindow / useChat) drains the queue with
 * `flush(send)`, resending each item in FIFO order via the same `sendMessage`
 * code path. Successfully-sent items are removed from the store; items that
 * fail again are re-enqueued (status stays `queued`) so the next reconnect
 * tries again.
 *
 * The queue is bounded at 200 items per conversation; oldest entries are
 * evicted (with a one-time InlineNotice surfaced via an `onEvicted` callback
 * if the host wants it). 200 is a "we won't lose your conversation" cap, not
 * a "we'll deliver everything you typed during a transcontinental flight"
 * promise — that would belong to a real outbox service.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "healthos-chat";
const DB_VERSION = 1;
const STORE = "outbound_messages";
const PER_CONVERSATION_CAP = 200;

export interface OutboundItem {
  /** Stable client-generated id (also used as the optimistic message id). */
  client_message_id: string;
  conversation_id: string;
  content: string;
  reply_to_id?: string | null;
  /** Wall-clock at enqueue, used for ordering + eviction. */
  enqueued_at: number;
  /** Bumped each time a flush attempt fails so we can back off / give up. */
  attempts: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Low-level IndexedDB helpers (Promise-wrapped, no external deps)
// ──────────────────────────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "client_message_id" });
        store.createIndex("by_conversation", "conversation_id", { unique: false });
        store.createIndex("by_enqueued_at", "enqueued_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function dbReadAll(conversationId: string | null): Promise<OutboundItem[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const store = txStore(db, "readonly");
      const req = store.getAll();
      req.onsuccess = () => {
        const all = (req.result ?? []) as OutboundItem[];
        const filtered = conversationId
          ? all.filter((item) => item.conversation_id === conversationId)
          : all;
        filtered.sort((a, b) => a.enqueued_at - b.enqueued_at);
        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function dbPut(item: OutboundItem): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const store = txStore(db, "readwrite");
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function dbDelete(clientMessageId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const store = txStore(db, "readwrite");
      const req = store.delete(clientMessageId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function dbCountForConversation(conversationId: string): Promise<number> {
  const items = await dbReadAll(conversationId);
  return items.length;
}

async function dbEvictOldest(conversationId: string, keep: number): Promise<OutboundItem[]> {
  const items = await dbReadAll(conversationId);
  if (items.length <= keep) return [];
  const evicted = items.slice(0, items.length - keep);
  await Promise.all(evicted.map((item) => dbDelete(item.client_message_id)));
  return evicted;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export interface UseOutboundQueueOptions {
  /** Optional: invoked once when items had to be evicted to honor the per-conv cap. */
  onEvicted?: (count: number) => void;
}

export interface UseOutboundQueueResult {
  /** Current queued items for the active conversation, FIFO. */
  queued: OutboundItem[];
  /** Persist a new outbound item. Idempotent on `client_message_id`. */
  enqueue: (item: Omit<OutboundItem, "enqueued_at" | "attempts"> & { attempts?: number }) => Promise<void>;
  /** Remove a single item (typically after successful resend). */
  remove: (clientMessageId: string) => Promise<void>;
  /**
   * Drain the queue. `send` should resolve to `true` on confirmed delivery
   * and `false` on failure (in which case the item is re-enqueued with an
   * incremented `attempts` count so callers can give up after N tries).
   */
  flush: (send: (item: OutboundItem) => Promise<boolean>) => Promise<{ sent: number; failed: number }>;
}

export function useOutboundQueue(
  conversationId: string | null,
  options: UseOutboundQueueOptions = {}
): UseOutboundQueueResult {
  const { onEvicted } = options;
  const [queued, setQueued] = useState<OutboundItem[]>([]);
  const flushingRef = useRef(false);

  const refresh = useCallback(async () => {
    const items = await dbReadAll(conversationId);
    setQueued(items);
  }, [conversationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enqueue = useCallback<UseOutboundQueueResult["enqueue"]>(
    async (item) => {
      const stored: OutboundItem = {
        client_message_id: item.client_message_id,
        conversation_id: item.conversation_id,
        content: item.content,
        reply_to_id: item.reply_to_id ?? null,
        enqueued_at: Date.now(),
        attempts: item.attempts ?? 0,
      };
      const ok = await dbPut(stored);
      if (!ok) return;

      const count = await dbCountForConversation(item.conversation_id);
      if (count > PER_CONVERSATION_CAP) {
        const evicted = await dbEvictOldest(item.conversation_id, PER_CONVERSATION_CAP);
        if (evicted.length > 0) onEvicted?.(evicted.length);
      }
      await refresh();
    },
    [refresh, onEvicted]
  );

  const remove = useCallback<UseOutboundQueueResult["remove"]>(
    async (clientMessageId) => {
      await dbDelete(clientMessageId);
      await refresh();
    },
    [refresh]
  );

  const flush = useCallback<UseOutboundQueueResult["flush"]>(
    async (send) => {
      // Guard against re-entrant flushes — the WS open event can fire several
      // times during a flaky reconnect and we don't want to send duplicates.
      if (flushingRef.current) return { sent: 0, failed: 0 };
      flushingRef.current = true;
      try {
        const items = await dbReadAll(conversationId);
        let sent = 0;
        let failed = 0;
        for (const item of items) {
          let ok = false;
          try {
            ok = await send(item);
          } catch {
            ok = false;
          }
          if (ok) {
            await dbDelete(item.client_message_id);
            sent++;
          } else {
            await dbPut({ ...item, attempts: item.attempts + 1 });
            failed++;
          }
        }
        await refresh();
        return { sent, failed };
      } finally {
        flushingRef.current = false;
      }
    },
    [conversationId, refresh]
  );

  return { queued, enqueue, remove, flush };
}
