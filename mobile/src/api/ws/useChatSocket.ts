import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getChatSocket, resetChatSocket } from "./client";
import { sessionStore } from "@/auth/session";

interface UseChatSocketArgs {
  conversationId?: string;
  onEvent: (event: string, payload: unknown) => void;
}

export function useChatSocket({ conversationId, onEvent }: UseChatSocketArgs) {
  const [connected, setConnected] = useState(false);
  const token = sessionStore((s) => s.token);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const send = useCallback(
    (event: string, payload: unknown) => getChatSocket().send(event, payload),
    []
  );

  useEffect(() => {
    if (!token) {
      resetChatSocket();
      setConnected(false);
      return;
    }
    const socket = getChatSocket();
    const off = socket.on((event, payload) => {
      if (event === "ws:open") {
        setConnected(true);
        return;
      }
      if (event === "ws:close") {
        setConnected(false);
        return;
      }
      onEventRef.current(event, payload);
    });
    void socket.connect();
    return () => {
      off();
    };
  }, [token]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = getChatSocket();
    socket.joinRoom(conversationId);
    return () => {
      socket.leaveRoom(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      const socket = getChatSocket();
      if (state === "active") {
        socket.resume();
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, []);

  return {
    connected,
    send,
  };
}
