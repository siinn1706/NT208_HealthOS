import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../../shared/api-contracts';
import { chatRealtimeService, getMessageFromChatEvent } from '../api/services/chat-realtime-service';

type ChatWsState = 'idle' | 'connecting' | 'connected' | 'fallback' | 'error';
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

interface UseChatWebSocketOptions {
  conversationId: string;
  enabled?: boolean;
  onMessage?: (message: Message) => void;
}

export function useChatWebSocket({ conversationId, enabled = true, onMessage }: UseChatWebSocketOptions) {
  const [state, setState] = useState<ChatWsState>('idle');
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      setState('idle');
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
      setState('fallback');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (closed) return;
      setState('connecting');
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
            setState('connected');
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
              }
            } catch {
              // Ignore malformed realtime frames and keep REST state intact.
            }
          };
          ws.onerror = () => {
            if (!closed) setState('error');
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

  return { state, isLive: state === 'connected' };
}
