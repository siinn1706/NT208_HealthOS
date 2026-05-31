import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../../shared/api-contracts';
import {
  chatRealtimeService,
  getMessageFromChatEvent,
  getRemovedConversationIdFromChatEvent,
  getThreadReloadConversationIdFromChatEvent,
} from '../api/services/chat-realtime-service';

export type ChatWsState = 'idle' | 'connecting' | 'connected' | 'fallback' | 'error';
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

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
  const onMessageRef = useRef(onMessage);
  const onThreadEventRef = useRef(onThreadEvent);
  const onConversationRemovedRef = useRef(onConversationRemoved);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onThreadEventRef.current = onThreadEvent;
  }, [onThreadEvent]);

  useEffect(() => {
    onConversationRemovedRef.current = onConversationRemoved;
  }, [onConversationRemoved]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) return;
      clearReconnectTimer();
      const delay = Math.min(BASE_RECONNECT_DELAY_MS * (2 ** reconnectAttempt), MAX_RECONNECT_DELAY_MS);
      reconnectAttempt += 1;
      setConnectionState('fallback');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (closed) return;
      setConnectionState('connecting');
      chatRealtimeService.openSocket()
        .then((ws) => {
          if (closed) {
            ws.close();
            return;
          }
          socket = ws;
          ws.onopen = () => {
            if (closed) return;
            reconnectAttempt = 0;
            setConnectionState('connected');
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
          ws.onclose = () => {
            if (!closed) scheduleReconnect();
          };
        })
        .catch(() => {
          scheduleReconnect();
        });
    };

    connect();

    return () => {
      closed = true;
      clearReconnectTimer();
      socket?.close();
    };
  }, [conversationId, enabled]);

  const state = enabled && conversationId ? connectionState : 'idle';
  return { state, isLive: state === 'connected' };
}
