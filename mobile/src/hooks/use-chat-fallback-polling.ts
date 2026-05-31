import { useEffect } from 'react';
import type { ChatWsState } from './use-chat-websocket';

const DEFAULT_FALLBACK_POLL_MS = 10000;

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
  useEffect(() => {
    if (!enabled || (realtimeState !== 'fallback' && realtimeState !== 'error')) {
      return undefined;
    }

    void reload();
    const timer = setInterval(() => {
      void reload();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs, realtimeState, reload]);
}
