"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  sender: "user" | "ai" | "system";
  message: string;
};

type ChatBoxProps = {
  conversationId: string;
};

export default function ChatBox({ conversationId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const wsUrl = useMemo(() => {
    const wsBase =
      process.env.NEXT_PUBLIC_CORE_WS_URL ??
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
    return `${wsBase}/v1/chat/ws/${encodeURIComponent(conversationId)}`;
  }, [conversationId]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const handleOpen = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload?.message !== "string" || typeof payload?.sender !== "string") {
          return;
        }
        setMessages((prev) => [...prev, payload]);
      } catch {
        setMessages((prev) => [...prev, { sender: "system", message: "Received invalid message from server." }]);
      }
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    const handleError = () => {
      setError("Unable to connect to the chat service.");
      setIsConnected(false);
    };

    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", handleClose);
    ws.addEventListener("error", handleError);

    return () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("close", handleClose);
      ws.removeEventListener("error", handleError);
      ws.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMessage = draft.trim();
    setMessages((prev) => [...prev, { sender: "user", message: userMessage }]);
    setDraft("");

    wsRef.current.send(
      JSON.stringify({
        message: userMessage,
        history: messages.map((msg) => ({ sender: msg.sender, message: msg.message })),
      }),
    );
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="rounded-t-3xl bg-slate-950 px-6 py-5 text-white">
        <div className="text-sm font-semibold">AI Chat</div>
        <div className="mt-1 text-xs text-slate-300">Connects directly to the Core BE WebSocket service.</div>
      </div>

      <div className="flex min-h-[420px] flex-col gap-4 p-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Status: {isConnected ? "Connected" : "Disconnected"}</span>
          {error ? <span className="text-rose-500">{error}</span> : null}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-sm text-slate-500">Send a message to start the conversation.</div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`rounded-3xl px-4 py-3 shadow-sm ${
                  message.sender === "user"
                    ? "self-end bg-sky-500 text-white"
                    : message.sender === "ai"
                    ? "self-start bg-slate-100 text-slate-900"
                    : "self-center bg-amber-100 text-amber-900"
                }`}>
                <div className="text-sm leading-6">{message.message}</div>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <textarea
            rows={2}
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Nhập tin nhắn..."
            className="min-h-[84px] resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || !isConnected}
            className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-sky-950"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
