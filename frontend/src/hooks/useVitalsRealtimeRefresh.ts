"use client";

import { useCallback, useEffect, useRef } from "react";

import type { WsFrame, WsStatus } from "./useChatWs";

type RefreshCallback = () => void | Promise<void>;

export const VITALS_REALTIME_EVENT = "healthos:vitals-updated";
export const VITALS_REALTIME_RECONNECT_EVENT = "healthos:vitals-reconnect";

type UseVitalsRealtimeRefreshOptions = {
  enabled?: boolean;
  debounceMs?: number;
  onRefresh: RefreshCallback;
  onReconnectRefresh?: RefreshCallback;
};

function isVitalsUpdatedEvent(event: Event): boolean {
  const detail = (event as CustomEvent<WsFrame | undefined>).detail;
  return detail?.event === "vitals.updated";
}

export function useVitalsRealtimeRefresh({
  enabled = true,
  debounceMs = 750,
  onRefresh,
  onReconnectRefresh,
}: UseVitalsRealtimeRefreshOptions) {
  const refreshRef = useRef(onRefresh);
  const reconnectRefreshRef = useRef(onReconnectRefresh ?? onRefresh);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    reconnectRefreshRef.current = onReconnectRefresh ?? onRefresh;
  }, [onReconnectRefresh, onRefresh]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runRefresh = useCallback((callback: RefreshCallback) => {
    try {
      void Promise.resolve(callback()).catch(() => {
        // Refresh owners already render their last known state on failed fetches.
      });
    } catch {
      // Never let a consumer refresh error break the shared socket hook.
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    const handleReconnect = () => {
      clearTimer();
      runRefresh(reconnectRefreshRef.current);
    };

    const handleVitalsEvent = (event: Event) => {
      if (!isVitalsUpdatedEvent(event)) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        runRefresh(refreshRef.current);
      }, debounceMs);
    };

    window.addEventListener(VITALS_REALTIME_EVENT, handleVitalsEvent);
    window.addEventListener(VITALS_REALTIME_RECONNECT_EVENT, handleReconnect);

    return () => {
      window.removeEventListener(VITALS_REALTIME_EVENT, handleVitalsEvent);
      window.removeEventListener(VITALS_REALTIME_RECONNECT_EVENT, handleReconnect);
      clearTimer();
    };
  }, [clearTimer, debounceMs, enabled, runRefresh]);

  useEffect(() => clearTimer, [clearTimer]);

  const status: WsStatus = "connected";
  const isConnected = true;

  return { status, isConnected };
}
