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

import { buildAuthFrame, isAuthRejected } from "@/lib/ws-auth-protocol";
import { resolveCoreWebSocketBase } from "@/lib/core-websocket-url";

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
  /**
   * Fired the first time the socket opens AFTER a transient drop (i.e. once
   * `reconnectAttemptsRef` was non-zero on the previous open). Consumers
   * use this to refetch any state that may have changed while the WS was
   * offline — e.g. the active conversation's messages so a stuck "streaming"
   * AI bubble gets replaced with the final DB row (CRITICAL C6 in the FE
   * review). Does NOT fire on the initial connect.
   */
  onReconnect?: () => void;
};

type UseChatWsResult = {
  status: WsStatus;
  isConnected: boolean;
  /** Send an event frame to the server. */
  sendEvent: (event: string, payload?: Record<string, unknown>) => void;
  /** Manually close and stop reconnecting. */
  disconnect: () => void;
  /**
   * True after the server closed the socket with code 4001 (token expired or
   * session ended). The UI must surface a re-auth banner instead of pretending
   * the connection is just flaky.
   */
  sessionExpired: boolean;
  /** True while we are actively retrying after a drop. */
  isReconnecting: boolean;
  /** Trigger a manual reconnect (resets the backoff counter). */
  reconnectNow: () => void;
};

export function useChatWs({
  onEvent,
  enabled = true,
  onReconnect,
}: UseChatWsOptions): UseChatWsResult {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectGenerationRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  // Ref to hold latest connect function — avoids circular useCallback dependency
  const connectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Keep callback refs in sync so we don't need them as connect() deps.
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
    const generation = ++connectGenerationRef.current;
    intentionalCloseRef.current = false;

    // Always mint a fresh short-lived WS ticket for each connection attempt.
    const token = await fetchToken();
    if (generation !== connectGenerationRef.current || intentionalCloseRef.current) {
      return;
    }

    tokenRef.current = token;
    if (!tokenRef.current) {
      setStatus("error");
      setIsReconnecting(false);
      return;
    }

    const wsBase = resolveCoreWebSocketBase(process.env.NEXT_PUBLIC_CORE_WS_URL);
    // Token sent as first post-connect frame — never in URL (prevents log leakage)
    const wsUrl = `${wsBase}/ws`;

    setStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setStatus("error");
      setIsReconnecting(false);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (generation !== connectGenerationRef.current) return;
      // Snapshot BEFORE we reset the counter so we can tell whether this
      // open is a fresh subscribe or a recovery from a transient drop.
      const wasReconnect = reconnectAttemptsRef.current > 0;

      setStatus("connected");
      setSessionExpired(false);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;

      // Send auth frame first — token must not appear in the URL
      ws.send(buildAuthFrame(tokenRef.current ?? ""));

      // Send handshake
      ws.send(JSON.stringify({ event: "client:hello", payload: {} }));

      // Tell the consumer to refetch any state that may have changed while
      // the WS was offline (active conversation messages, unread counts, …).
      // Critically rescues stuck `streaming` AI bubbles: the worker may have
      // landed `ai:completed` while we were disconnected, and the only way
      // to get the final content is to GET the message list again.
      if (wasReconnect) {
        try {
          onReconnectRef.current?.();
        } catch {
          /* never let consumer errors break the socket */
        }
      }
    };

    ws.onmessage = (evt) => {
      if (generation !== connectGenerationRef.current) return;
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
      if (generation !== connectGenerationRef.current) return;
      setStatus("error");
    };

    ws.onclose = (evt) => {
      if (generation !== connectGenerationRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");

      if (intentionalCloseRef.current) return;

      // 4001 — token expired or session ended. Surface a re-auth banner via
      // `sessionExpired` and STOP retrying; the user must explicitly sign in
      // again. Auto-reconnecting here would either spam the server or silently
      // hide the auth issue.
      // 4401 — post-connect auth ticket rejected (new transport protocol).
      if (evt.code === 4001 || isAuthRejected(evt.code)) {
        tokenRef.current = null;
        setSessionExpired(true);
        setIsReconnecting(false);
        return;
      }

      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_MS
        );
        reconnectAttemptsRef.current += 1;
        setIsReconnecting(true);
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
      } else {
        setIsReconnecting(false);
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
    connectGenerationRef.current += 1;
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
    if (enabled) {
      connect();
    }
    return () => {
      connectGenerationRef.current += 1;
      clearReconnectTimer();
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("disconnected");
      setIsReconnecting(false);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
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
