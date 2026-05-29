"use client";

/**
 * useHealthAlerts — manages real-time health alerts via WebSocket.
 *
 * Usage:
 *   const { alerts, dismissAlert, status } = useHealthAlerts();
 *   const { alerts, dismissAlert, status } = useHealthAlerts({ enabled: false });
 *
 * The server sends frames:
 *   { event: "health_alert", payload: { id, type, message, timestamp } }
 *
 * WebSocket endpoint: /ws?token=<JWT> (proxied via BFF ws-token exchange)
 *
 * enabled prop allows callers to gate the connection on auth state.
 * Safety note: useChatWs handles unauthenticated cases autonomously —
 * fetchToken() failure sets status="error" without opening a socket;
 * server close code 4001 sets sessionExpired=true and stops retrying.
 * Components inside the (app) layout are server-redirected if unauthenticated,
 * providing an additional guard.
 *
 * NOTE: Core does not yet emit real `health_alert` WebSocket events.
 * This hook is wired and ready; backend event emission is pending.
 */

import { useCallback, useState } from "react";
import { useChatWs, type WsFrame, type WsStatus } from "./useChatWs";

export interface HealthAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

export type UseHealthAlertsOptions = {
  /** Gate the WebSocket connection. Defaults to true. */
  enabled?: boolean;
  /** Refetch dependent state after the shared socket reconnects. */
  onReconnect?: () => void;
};

type UseHealthAlertsResult = {
  alerts: HealthAlert[];
  status: WsStatus;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
  /** Most recent raw WebSocket frame, useful for realtime refetch signals. */
  lastMessage: WsFrame | null;
};

export function useHealthAlerts({
  enabled = true,
  onReconnect,
}: UseHealthAlertsOptions = {}): UseHealthAlertsResult {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [lastMessage, setLastMessage] = useState<WsFrame | null>(null);

  const handleEvent = useCallback((frame: WsFrame) => {
    setLastMessage(frame);
    if (frame.event === "health_alert") {
      const payload = frame.payload as {
        id: string;
        type: "critical" | "warning" | "info";
        message: string;
      };
      setAlerts((prev) => [
        { ...payload, timestamp: frame.timestamp ?? new Date().toISOString() },
        ...prev,
      ]);
    }
  }, []);

  const { status } = useChatWs({
    onEvent: handleEvent,
    enabled,
    onReconnect,
  });

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    status,
    dismissAlert,
    clearAll,
    lastMessage,
  };
}
