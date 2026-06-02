/**
 * chat-ai-event-queue — small in-memory queue for AI lifecycle WS events.
 *
 * Problem:
 *   WebSocket `ai:started` / `ai:completed` events can arrive before
 *   `sendAiMessage` resolves and the caller has committed its optimistic row.
 *   Without deduplication, the WS event triggers a message reload that races
 *   with the buffered SSE response; the optimistic row is either duplicated or
 *   the server row appears twice after the two reloads settle.
 *
 * Solution:
 *   When an AI lifecycle event arrives, the caller checks whether it already
 *   has an optimistic row with the matching `client_message_id`. If not, the
 *   event is held in this queue for up to `QUEUE_TTL_MS`. When the optimistic
 *   row is later committed (i.e. `sendAiMessage` resolves), the caller drains
 *   the queue and replays any buffered events — ensuring they are processed
 *   after the local state is ready.
 *
 * Scope:
 *   Module-level singleton. Only one AI stream per app session is expected at
 *   a time; the queue is keyed by `client_message_id` so multiple in-flight
 *   requests (unlikely) do not collide.
 */

import type { AiLifecycleEvent } from './chat-realtime-service';

/** Max time (ms) to hold a queued event before auto-evicting it as stale. */
const QUEUE_TTL_MS = 10_000;

interface QueueEntry {
  event: AiLifecycleEvent;
  queuedAt: number;
}

const queue = new Map<string, QueueEntry[]>();

/**
 * Enqueue an AI lifecycle event keyed by `client_message_id`.
 * If no `client_message_id` is present the event cannot be correlated and
 * is not queued (it will be handled via the standard thread-reload path).
 */
export function enqueueAiLifecycleEvent(event: AiLifecycleEvent): boolean {
  if (!event.client_message_id) return false;
  const key = event.client_message_id;
  evictStaleEntries();
  const existing = queue.get(key) ?? [];
  existing.push({ event, queuedAt: Date.now() });
  queue.set(key, existing);
  return true;
}

/**
 * Drain and return all queued events for the given `clientMessageId`.
 * The queue entry is removed so events are delivered exactly once.
 */
export function drainAiLifecycleEvents(clientMessageId: string): AiLifecycleEvent[] {
  evictStaleEntries();
  const entries = queue.get(clientMessageId) ?? [];
  queue.delete(clientMessageId);
  return entries.map((e) => e.event);
}

/** Drop events that have exceeded the TTL to avoid unbounded memory growth. */
function evictStaleEntries(): void {
  const now = Date.now();
  for (const [key, entries] of queue) {
    const live = entries.filter((e) => now - e.queuedAt < QUEUE_TTL_MS);
    if (live.length === 0) {
      queue.delete(key);
    } else {
      queue.set(key, live);
    }
  }
}
