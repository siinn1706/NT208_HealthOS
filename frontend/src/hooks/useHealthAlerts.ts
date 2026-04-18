"use client";

/**
 * useHealthAlerts — manages real-time health alerts via WebSocket.
 *
 * Usage:
 *   const { alerts, dismissAlert, status } = useHealthAlerts();
 *
 * The server sends frames:
 *   { event: "health_alert", payload: { id, type, message, timestamp } }
 *
 * BFF TODO: WebSocket endpoint /ws?token=<JWT>
 *   - Subscribe to "health_alert" events
 *   - Receive real-time notifications for abnormal vitals
 */

import { useCallback, useState } from "react";
import { useChatWs, type WsFrame, type WsStatus } from "./useChatWs";

export interface HealthAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

type UseHealthAlertsResult = {
  alerts: HealthAlert[];
  status: WsStatus;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
  /** Most recent raw WebSocket frame, useful for realtime chart updates */
  lastMessage: WsFrame | null;
};

export function useHealthAlerts(): UseHealthAlertsResult {
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
    enabled: true, // TODO: only connect when user is authenticated
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
