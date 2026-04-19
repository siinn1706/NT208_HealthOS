import { fetchWsTicket } from "@/api/endpoints/auth";
import { env } from "@/config/env";
import { dedupeKey, heartbeatEvent, heartbeatReply, helloEvent, wsEventSchema } from "./events";

type Listener = (event: string, payload: unknown) => void;

const BACKOFF_STEPS = [1000, 2000, 5000, 15000, 30000];
const DEDUPE_LIMIT = 200;

class LRU<T> {
  private map = new Map<T, true>();
  constructor(private limit: number) {}
  has(key: T): boolean {
    return this.map.has(key);
  }
  add(key: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.limit) {
      const first = this.map.keys().next().value as T | undefined;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, true);
  }
}

export class ChatSocketClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private pending: { event: string; payload: unknown }[] = [];
  private rooms = new Set<string>();
  private retryAttempts = 0;
  private retryHandle: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  private connecting = false;
  private dedupe = new LRU<string>(DEDUPE_LIMIT);
  private ticketRefreshedThisCycle = false;

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  joinRoom(conversationId: string): void {
    this.rooms.add(conversationId);
    if (this.isOpen()) {
      this.sendRaw("conv:join", { conversation_id: conversationId });
    }
  }

  leaveRoom(conversationId: string): void {
    this.rooms.delete(conversationId);
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(event: string, payload: unknown): boolean {
    if (this.isOpen()) {
      this.sendRaw(event, payload);
      return true;
    }
    if (event === "msg:send") {
      this.pending.push({ event, payload });
    }
    return false;
  }

  private sendRaw(event: string, payload: unknown): void {
    try {
      this.socket?.send(JSON.stringify({ event, payload }));
    } catch {
      // ignore
    }
  }

  async connect(): Promise<void> {
    if (this.connecting || this.isOpen()) return;
    this.connecting = true;
    try {
      const ticket = await fetchWsTicket();
      const url = `${env.coreWsUrl.replace(/\/$/, "")}/ws?token=${encodeURIComponent(ticket.ws_ticket)}`;
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.retryAttempts = 0;
        this.ticketRefreshedThisCycle = false;
        this.sendRaw(helloEvent, { client: "healthos-mobile", platform: "android" });
        this.rooms.forEach((id) =>
          this.sendRaw("conv:join", { conversation_id: id })
        );
        for (const queued of this.pending.splice(0)) {
          this.sendRaw(queued.event, queued.payload);
        }
        this.emit("ws:open", null);
      };

      socket.onmessage = (msg) => {
        try {
          const parsed = wsEventSchema.parse(JSON.parse(String(msg.data)));
          if (parsed.event === heartbeatEvent) {
            this.sendRaw(heartbeatReply, {});
            return;
          }
          const key = dedupeKey(parsed.event, parsed.payload);
          if (this.dedupe.has(key)) return;
          this.dedupe.add(key);
          this.emit(parsed.event, parsed.payload ?? null);
        } catch {
          // ignore malformed
        }
      };

      socket.onerror = () => {
        // Close handler will retry.
      };

      socket.onclose = (closeEvent) => {
        this.connecting = false;
        this.socket = null;
        this.emit("ws:close", { code: closeEvent.code, reason: closeEvent.reason });
        if (closeEvent.code === 4001 && !this.ticketRefreshedThisCycle) {
          this.ticketRefreshedThisCycle = true;
          this.scheduleRetry(0);
          return;
        }
        if (this.alive) {
          this.scheduleRetry(this.retryAttempts);
          this.retryAttempts = Math.min(BACKOFF_STEPS.length - 1, this.retryAttempts + 1);
        }
      };
    } catch {
      this.connecting = false;
      if (this.alive) {
        this.scheduleRetry(this.retryAttempts);
        this.retryAttempts = Math.min(BACKOFF_STEPS.length - 1, this.retryAttempts + 1);
      }
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.alive = false;
    if (this.retryHandle) {
      clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }
    try {
      this.socket?.close(1000, "client disconnect");
    } catch {
      // ignore
    }
    this.socket = null;
  }

  resume(): void {
    this.alive = true;
    if (!this.isOpen()) {
      this.scheduleRetry(0);
    }
  }

  private scheduleRetry(attempt: number): void {
    if (!this.alive) return;
    if (this.retryHandle) clearTimeout(this.retryHandle);
    const base = BACKOFF_STEPS[Math.min(attempt, BACKOFF_STEPS.length - 1)] ?? 30000;
    const jitter = Math.floor(Math.random() * 500);
    this.retryHandle = setTimeout(() => {
      this.retryHandle = null;
      void this.connect();
    }, base + jitter);
  }

  private emit(event: string, payload: unknown): void {
    this.listeners.forEach((l) => {
      try {
        l(event, payload);
      } catch {
        // ignore
      }
    });
  }
}

let singleton: ChatSocketClient | null = null;

export function getChatSocket(): ChatSocketClient {
  if (!singleton) {
    singleton = new ChatSocketClient();
  }
  return singleton;
}

export function resetChatSocket(): void {
  if (singleton) {
    singleton.disconnect();
    singleton = null;
  }
}
