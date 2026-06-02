import { useEffect, useRef } from 'react';
import type { ChatWsState } from './use-chat-websocket';

const DEFAULT_FALLBACK_POLL_MS = 10_000;

interface UseChatFallbackPollingOptions {
  enabled?: boolean;
  realtimeState: ChatWsState;
  reload: () => Promise<void> | void;
  intervalMs?: number;
}

export function useChatFallbackPolling({
  enabled = true,
  realtimeState,
  reload,
  intervalMs = DEFAULT_FALLBACK_POLL_MS,
}: UseChatFallbackPollingOptions) {
  // Tracks the wall-clock time until which polling is suppressed due to a
  // 429 Retry-After response thrown by the caller's reload() function.
  // A value of 0 means no active suppression.
  const retryAfterUntilRef = useRef<number>(0);

  useEffect(() => {
    // Only poll when the WS is fully down (fallback or error).
    // Skip while WS is actively attempting to reconnect ('connecting') to avoid
    // firing REST and WS concurrently — the WS attempt takes priority.
    if (!enabled || (realtimeState !== 'fallback' && realtimeState !== 'error')) {
      return undefined;
    }

    // Wraps the caller-supplied reload() to intercept 429 Retry-After signals.
    // The reload function must throw (or reject) with a Response-shaped object
    // `{ status: 429, headers: { get(name): string | null } }` to signal backoff.
    const wrappedReload = async () => {
      // Honor an active Retry-After suppression window.
      if (Date.now() < retryAfterUntilRef.current) {
        return;
      }

      try {
        await reload();
      } catch (err: unknown) {
        // Extract Retry-After from fetch-based wrappers that throw on non-2xx.
        // Pattern: `throw response` or `throw { status, headers }`.
        if (err !== null && typeof err === 'object' && 'status' in err) {
          const res = err as { status: number; headers?: { get?: (h: string) => string | null } };
          if (res.status === 429) {
            const retryAfterHeader = res.headers?.get?.('Retry-After') ?? null;
            const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
            if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
              retryAfterUntilRef.current = Date.now() + retryAfterSec * 1_000;
            }
          }
        }
        // All other errors are silently swallowed — the next tick will retry.
      }
    };

    // Fire immediately on entering fallback/error state, then on each interval tick.
    void wrappedReload();
    const timer = setInterval(() => {
      void wrappedReload();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs, realtimeState, reload]);
}
