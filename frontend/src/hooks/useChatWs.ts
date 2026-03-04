"use client";

/**
 * useChatWs — manages the WebSocket connection to Core BE.
 *
 * Usage:
 *   const { sendEvent, isConnected } = useChatWs({ onEvent });
 *
 * The server sends frames:
 *   { event: string, payload: Record<string, unknown>, timestamp: string }
 *
 * Client sends frames:
 *   { event: string, payload: Record<string, unknown> }
 */

import { useCallback, useEffect, useRef, useState } from "react";

const CORE_WS_URL = process.env.NEXT_PUBLIC_CORE_WS_URL ?? "ws://localhost:8000";
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export type WsFrame = {
  event: string;
  payload: Record<string, unknown>;
  timestamp?: string;
};

type UseChatWsOptions = {
  /** Called on every frame received from the server. */
  onEvent: (frame: WsFrame) => void;
  /** Whether the hook should attempt to connect at all. */
  enabled?: boolean;
};

type UseChatWsResult = {
  status: WsStatus;
  isConnected: boolean;
  /** Send an event frame to the server. */
  sendEvent: (event: string, payload?: Record<string, unknown>) => void;
  /** Manually close and stop reconnecting. */
  disconnect: () => void;
};

export function useChatWs({
  onEvent,
  enabled = true,
}: UseChatWsOptions): UseChatWsResult {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const onEventRef = useRef(onEvent);
  // Ref to hold latest connect function — avoids circular useCallback dependency
  const connectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Keep onEvent ref in sync so we don't need it as a dependency
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/v1/auth/ws-token");
      if (!res.ok) return null;
      const data = await res.json();
      return data.token ?? null;
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;
    intentionalCloseRef.current = false;

    // Get (or re-use) the auth token
    if (!tokenRef.current) {
      tokenRef.current = await fetchToken();
    }
    if (!tokenRef.current) {
      setStatus("error");
      return;
    }

    const wsUrl = `${CORE_WS_URL}/ws?token=${encodeURIComponent(tokenRef.current)}`;

    setStatus("connecting");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;

      // Send handshake
      ws.send(JSON.stringify({ event: "client:hello", payload: {} }));
    };

    ws.onmessage = (evt) => {
      try {
        const frame = JSON.parse(evt.data as string) as WsFrame;

        // Handle server ping — reply pong
        if (frame.event === "ping") {
          ws.send(JSON.stringify({ event: "pong", payload: {} }));
          return;
        }

        onEventRef.current(frame);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (evt) => {
      wsRef.current = null;
      setStatus("disconnected");

      if (intentionalCloseRef.current) return;

      // Token expired (4001) — clear and re-fetch on next attempt
      if (evt.code === 4001) {
        tokenRef.current = null;
      }

      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_MS
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
      }
    };
  }, [enabled, fetchToken]);  

  // Keep connectRef in sync with the latest connect function
  useEffect(() => { connectRef.current = connect; }, [connect]);

  const sendEvent = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event, payload }));
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, [clearReconnectTimer]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      clearReconnectTimer();
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    status,
    isConnected: status === "connected",
    sendEvent,
    disconnect,
  };
}
