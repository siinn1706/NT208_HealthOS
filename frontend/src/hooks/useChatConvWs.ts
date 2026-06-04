"use client";

/**
 * useChatConvWs — manages a per-conversation WebSocket connection to Core BE.
 *
 * Mirrors useChatWs but targets the per-conversation endpoint at
 * `${CORE_WS_URL}/v1/chat/ws/{conversation_id}` (NO token in URL — sent as
 * first post-connect auth frame instead to prevent proxy/log leakage).
 * The backend auto-joins the `conv:{id}` room on connect, so the
 * client does NOT need to send a `conv:join` event.
 *
 * Auth: a short-lived ws_ticket is vended by /api/v1/auth/ws-token and sent as
 * the first WebSocket frame: { "type": "auth", "ticket": "<token>" }
 *
 * Reconnect budget: attempt counters are stored in a module-level map keyed by
 * conversationId so that switching conversations and remounting the hook does
 * not reset the budget and trigger a thundering-herd of reconnects. The counter
 * is cleared only on a successful connection or an explicit reconnectNow() call.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { WsFrame, WsStatus } from "@/hooks/useChatWs";
import { buildAuthFrame, isAuthRejected } from "@/lib/ws-auth-protocol";
import { resolveCoreWebSocketBase } from "@/lib/core-websocket-url";

const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ── Session-scoped reconnect budget ──────────────────────────────────────────
// Keyed by conversationId. Survives component unmount/remount so per-
// conversation-switch resets cannot reset the budget and cause reconnect storms.
// Entries are pruned when a connection succeeds or reconnectNow() is called.
const sessionReconnectAttempts = new Map<string, number>();

function getAttempts(conversationId: string): number {
  return sessionReconnectAttempts.get(conversationId) ?? 0;
}

function setAttempts(conversationId: string, n: number): void {
  sessionReconnectAttempts.set(conversationId, n);
}

function resetAttempts(conversationId: string): void {
  sessionReconnectAttempts.delete(conversationId);
}

// Jittered exponential backoff matching the mobile ws-backoff helper.
// attempt 0 → ~1 s, attempt 9 → ~30 s (capped), ±25 % jitter.
function reconnectDelay(attempt: number): number {
  const base = Math.min(1_000 * Math.pow(2, attempt), RECONNECT_MAX_MS);
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Hook ──────────────────────────────────────────────────────────────────────

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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectGenerationRef = useRef(0);
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
      const data = (await res.json()) as { data?: { token?: string } };
      return data.data?.token ?? null;
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (!conversationId) return;
    const generation = ++connectGenerationRef.current;
    intentionalCloseRef.current = false;

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
    const wsUrl = `${wsBase}/v1/chat/ws/${encodeURIComponent(conversationId)}`;

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
      const wasReconnect = getAttempts(conversationId) > 0;

      // Send auth frame first — token must not appear in the URL
      ws.send(buildAuthFrame(tokenRef.current ?? ""));

      setStatus("connected");
      setSessionExpired(false);
      setIsReconnecting(false);
      // Successful connection — clear the budget for this conversation.
      resetAttempts(conversationId);

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
      if (generation !== connectGenerationRef.current) return;
      setStatus("error");
    };

    ws.onclose = (evt) => {
      if (generation !== connectGenerationRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");

      if (intentionalCloseRef.current) return;

      // 4001 — REST token expired; 4401 — post-connect auth ticket rejected.
      // Both cases: surface session-expired and stop reconnecting.
      if (evt.code === 4001 || isAuthRejected(evt.code)) {
        tokenRef.current = null;
        setSessionExpired(true);
        setIsReconnecting(false);
        return;
      }

      const currentAttempts = getAttempts(conversationId);
      if (currentAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = reconnectDelay(currentAttempts);
        setAttempts(conversationId, currentAttempts + 1);
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
    // Explicit user-triggered reconnect — reset the session budget for this
    // conversation so it gets a full fresh MAX_RECONNECT_ATTEMPTS quota.
    if (conversationId) resetAttempts(conversationId);
    setSessionExpired(false);
    setIsReconnecting(true);
    tokenRef.current = null;
    void connectRef.current?.();
  }, [clearReconnectTimer, conversationId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (enabled && conversationId) {
      void connect();
    }
    return () => {
      connectGenerationRef.current += 1;
      clearReconnectTimer();
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("disconnected");
      setIsReconnecting(false);
      // Note: intentionally NOT resetting sessionReconnectAttempts here —
      // the whole point is to preserve the budget across remounts.
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
