"use client";

/**
 * useChatConvWs — manages a per-conversation WebSocket connection to Core BE.
 *
 * Mirrors useChatWs but targets the per-conversation endpoint at
 * `${CORE_WS_URL}/v1/chat/ws/{conversation_id}?token=<ws_ticket>` instead of the
 * global `/ws`. The backend auto-joins the `conv:{id}` room on connect, so the
 * client does NOT need to send a `conv:join` event.
 *
 * The token is a short-lived ws_ticket vended by /api/v1/auth/ws-token.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { WsFrame, WsStatus } from "@/hooks/useChatWs";
import { resolveCoreWebSocketBase } from "@/lib/core-websocket-url";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

type UseChatConvWsOptions = {
  /** Conversation to open the socket for. Null/empty → hook does nothing. */
  conversationId: string | null;
  /** Called on every frame received from the server. */
  onEvent: (frame: WsFrame) => void;
  /** Whether the hook should attempt to connect at all. */
  enabled?: boolean;
  /** Fired on a successful reconnect (not the initial connect). */
  onReconnect?: () => void;
};

type UseChatConvWsResult = {
  status: WsStatus;
  isConnected: boolean;
  sendEvent: (event: string, payload?: Record<string, unknown>) => void;
  disconnect: () => void;
  sessionExpired: boolean;
  isReconnecting: boolean;
  reconnectNow: () => void;
};

export function useChatConvWs({
  conversationId,
  onEvent,
  enabled = true,
  onReconnect,
}: UseChatConvWsOptions): UseChatConvWsResult {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  const connectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

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
      const data = (await res.json()) as { token?: string };
      return data.token ?? null;
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (!conversationId) return;
    intentionalCloseRef.current = false;

    tokenRef.current = await fetchToken();
    if (!tokenRef.current) {
      setStatus("error");
      return;
    }

    const wsBase = resolveCoreWebSocketBase(process.env.NEXT_PUBLIC_CORE_WS_URL);
    const wsUrl =
      `${wsBase}/v1/chat/ws/${encodeURIComponent(conversationId)}` +
      `?token=${encodeURIComponent(tokenRef.current)}`;

    setStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setStatus("error");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      const wasReconnect = reconnectAttemptsRef.current > 0;

      setStatus("connected");
      setSessionExpired(false);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;

      if (wasReconnect) {
        try {
          onReconnectRef.current?.();
        } catch {
          /* never let consumer errors break the socket */
        }
      }
    };

    ws.onmessage = (evt) => {
      try {
        const frame = JSON.parse(evt.data as string) as WsFrame;

        if (frame.event === "ping") {
          ws.send(JSON.stringify({ event: "pong", payload: {} }));
          return;
        }

        onEventRef.current(frame);
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (evt) => {
      wsRef.current = null;
      setStatus("disconnected");

      if (intentionalCloseRef.current) return;

      if (evt.code === 4001) {
        tokenRef.current = null;
        setSessionExpired(true);
        setIsReconnecting(false);
        return;
      }

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_MS,
        );
        reconnectAttemptsRef.current += 1;
        setIsReconnecting(true);
        reconnectTimerRef.current = setTimeout(
          () => connectRef.current?.(),
          delay,
        );
      } else {
        setIsReconnecting(false);
      }
    };
  }, [enabled, conversationId, fetchToken]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendEvent = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event, payload }));
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
    setIsReconnecting(false);
  }, [clearReconnectTimer]);

  const reconnectNow = useCallback(() => {
    clearReconnectTimer();
    reconnectAttemptsRef.current = 0;
    setSessionExpired(false);
    setIsReconnecting(true);
    tokenRef.current = null;
    void connectRef.current?.();
  }, [clearReconnectTimer]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (enabled && conversationId) {
      void connect();
    }
    return () => {
      clearReconnectTimer();
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    status,
    isConnected: status === "connected",
    sendEvent,
    disconnect,
    sessionExpired,
    isReconnecting,
    reconnectNow,
  };
}
