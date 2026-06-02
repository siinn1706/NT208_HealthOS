import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Message } from '../../../shared/api-contracts';
import {
  chatRealtimeService,
  buildChatWsUrl,
  buildAuthFrame,
  isAuthRejected,
  getMessageFromChatEvent,
  getRemovedConversationIdFromChatEvent,
  getThreadReloadConversationIdFromChatEvent,
} from '../api/services/chat-realtime-service';
import { nextReconnectDelay } from '../lib/ws-backoff';

export type ChatWsState = 'idle' | 'connecting' | 'connected' | 'fallback' | 'error';

// Ticket cache entry — reuse until 5 s before expiry to avoid round-trips on every reconnect.
interface CachedTicket {
  url: string;
  ticket: string;
  expiresAt: number;
}

// 5-second safety margin before treating a ticket as stale.
const TICKET_EXPIRY_MARGIN_MS = 5_000;

interface UseChatWebSocketOptions {
  conversationId: string;
  enabled?: boolean;
  onMessage?: (message: Message) => void;
  onThreadEvent?: () => void;
  onConversationRemoved?: () => void;
}

export function useChatWebSocket({
  conversationId,
  enabled = true,
  onMessage,
  onThreadEvent,
  onConversationRemoved,
}: UseChatWebSocketOptions) {
  const [connectionState, setConnectionState] = useState<ChatWsState>('idle');

  // Stable refs for callbacks so closures inside useEffect never go stale.
  const onMessageRef = useRef(onMessage);
  const onThreadEventRef = useRef(onThreadEvent);
  const onConversationRemovedRef = useRef(onConversationRemoved);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onThreadEventRef.current = onThreadEvent; }, [onThreadEvent]);
  useEffect(() => { onConversationRemovedRef.current = onConversationRemoved; }, [onConversationRemoved]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Per-mount ticket cache: reuse the WS URL across reconnects while ticket is valid.
    let ticketCache: CachedTicket | null = null;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const closeSocket = () => {
      if (socket) {
        // Remove handlers before closing to prevent onclose firing scheduleReconnect.
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) return;
      clearReconnectTimer();
      const delay = nextReconnectDelay(reconnectAttempt);
      reconnectAttempt += 1;
      setConnectionState('fallback');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    // ── Ticket resolution ─────────────────────────────────────────────────────
    // Reuse cached ticket when still valid; only call REST when stale or absent.

    const resolveWsUrl = async (): Promise<{ url: string; ticket: string } | null> => {
      const now = Date.now();
      if (ticketCache && now < ticketCache.expiresAt - TICKET_EXPIRY_MARGIN_MS) {
        return { url: ticketCache.url, ticket: ticketCache.ticket };
      }

      try {
        const ticket = await chatRealtimeService.wsTicket();
        const expiresAt = now + ticket.expires_in_seconds * 1_000;
        ticketCache = { url: buildChatWsUrl(), ticket: ticket.ws_ticket, expiresAt };
        return { url: ticketCache.url, ticket: ticketCache.ticket };
      } catch {
        // Ticket fetch failed; will retry on next reconnect cycle.
        return null;
      }
    };

    // ── Connect ───────────────────────────────────────────────────────────────

    const connect = async () => {
      if (closed) return;
      setConnectionState('connecting');

      const resolved = await resolveWsUrl();
      if (closed) return; // AppState may have backgrounded us during await.
      if (!resolved) {
        scheduleReconnect();
        return;
      }

      const { url: wsUrl, ticket } = resolved;

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }

      socket = ws;

      ws.onopen = () => {
        if (closed) return;
        reconnectAttempt = 0;
        setConnectionState('connected');
        // Send auth frame first — ticket must not appear in the URL
        ws.send(buildAuthFrame(ticket));
        ws.send(JSON.stringify({ event: 'client:hello', payload: {} }));
        ws.send(JSON.stringify({ event: 'conv:join', payload: { conversation_id: conversationId } }));
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data));
          if (frame?.event === 'ping') {
            ws.send(JSON.stringify({ event: 'pong', payload: {} }));
            return;
          }
          const message = getMessageFromChatEvent(frame);
          if (message && message.conversation_id === conversationId) {
            onMessageRef.current?.(message);
            return;
          }
          const removedConversationId = getRemovedConversationIdFromChatEvent(frame);
          if (removedConversationId === conversationId) {
            onConversationRemovedRef.current?.();
            return;
          }
          const reloadConversationId = getThreadReloadConversationIdFromChatEvent(frame);
          if (reloadConversationId === conversationId) {
            onThreadEventRef.current?.();
          }
        } catch {
          // Ignore malformed realtime frames and keep REST state intact.
        }
      };

      ws.onerror = () => {
        if (!closed) setConnectionState('error');
      };

      ws.onclose = (evt) => {
        socket = null;
        // 4401 — post-connect auth ticket rejected; clear ticket cache and stop reconnecting.
        if (isAuthRejected(evt.code)) {
          ticketCache = null;
          setConnectionState('error');
          return;
        }
        if (!closed) scheduleReconnect();
      };
    };

    // ── AppState gating ───────────────────────────────────────────────────────
    // Background/inactive: close socket to avoid battery drain and pointless
    // reconnect storms. Active: reset attempt counter and reconnect fresh.

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Suspend: tear down cleanly without scheduling a reconnect.
        clearReconnectTimer();
        closeSocket();
        setConnectionState('idle');
      } else if (nextState === 'active') {
        // Resume: start fresh — reset attempt counter so the first retry is fast.
        reconnectAttempt = 0;
        connect();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // ── Initial connect ───────────────────────────────────────────────────────
    connect();

    return () => {
      closed = true;
      appStateSub.remove();
      clearReconnectTimer();
      closeSocket();
    };
  }, [conversationId, enabled]);

  const state = enabled && conversationId ? connectionState : 'idle';
  return { state, isLive: state === 'connected' };
}
