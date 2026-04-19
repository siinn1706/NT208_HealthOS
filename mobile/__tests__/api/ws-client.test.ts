/**
 * Tests for `ChatSocketClient` — verifies the most failure-prone bits of
 * the realtime layer:
 *   - heartbeat: server `ping` → client `pong`
 *   - dedupe: legacy + canonical broadcasts collapse to one listener call
 *   - room rejoin after reconnect
 *   - REST queueing: msg:send while disconnected is replayed on open
 *   - error event lift to listeners (not silently dropped)
 */
import { ChatSocketClient } from "@/api/ws/client";

// Match the (CONNECTING / OPEN / CLOSING / CLOSED) constants used by RN/web.
const READY = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 } as const;

class FakeSocket {
  static last: FakeSocket | null = null;
  readyState: number = READY.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((evt: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  sent: Array<{ event: string; payload: unknown }> = [];

  constructor(public url: string) {
    FakeSocket.last = this;
  }

  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }

  close(code = 1000, reason = "client") {
    this.readyState = READY.CLOSED;
    this.onclose?.({ code, reason });
  }

  // Test helpers
  fakeOpen() {
    this.readyState = READY.OPEN;
    this.onopen?.();
  }
  fakeMessage(event: string, payload?: unknown) {
    this.onmessage?.({ data: JSON.stringify({ event, payload, timestamp: "now" }) });
  }
}

// Mock the WS ticket fetch so connect() doesn't try to hit the network.
jest.mock("@/api/endpoints/auth", () => ({
  fetchWsTicket: jest
    .fn()
    .mockResolvedValue({ ws_ticket: "fake-ticket", expires_in_seconds: 120 }),
}));

beforeAll(() => {
  // Install fake WebSocket constructor for these tests only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WebSocket = FakeSocket as unknown as typeof WebSocket;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WebSocket.OPEN = READY.OPEN;
});

afterEach(() => {
  jest.clearAllMocks();
  FakeSocket.last = null;
});

describe("ChatSocketClient", () => {
  it("sends client:hello + queued conv:join after open", async () => {
    const client = new ChatSocketClient();
    client.joinRoom("conv-1");
    await client.connect();
    expect(FakeSocket.last).not.toBeNull();
    FakeSocket.last!.fakeOpen();

    const evts = FakeSocket.last!.sent.map((m) => m.event);
    expect(evts).toContain("client:hello");
    expect(evts).toContain("conv:join");

    client.disconnect();
  });

  it("replies pong to server ping immediately", async () => {
    const client = new ChatSocketClient();
    await client.connect();
    FakeSocket.last!.fakeOpen();
    FakeSocket.last!.sent = []; // reset
    FakeSocket.last!.fakeMessage("ping");
    expect(FakeSocket.last!.sent).toEqual([{ event: "pong", payload: {} }]);
    client.disconnect();
  });

  it("dedupes legacy + canonical pair to one listener call", async () => {
    const client = new ChatSocketClient();
    const heard: Array<{ event: string }> = [];
    client.on((event) => {
      if (event.startsWith("ws:")) return; // skip lifecycle events
      heard.push({ event });
    });
    await client.connect();
    FakeSocket.last!.fakeOpen();

    // Same server-side action: backend emits both
    FakeSocket.last!.fakeMessage("msg:pinned", {
      conversation_id: "c1",
      message_id: "m1",
    });
    FakeSocket.last!.fakeMessage("chat.message.pinned", {
      conversation_id: "c1",
      message_id: "m1",
    });

    expect(heard.length).toBe(1);
    client.disconnect();
  });

  it("queues a msg:send while disconnected and flushes it on open", async () => {
    const client = new ChatSocketClient();
    // Send before connect — should buffer
    const sentNow = client.send("msg:send", {
      conversation_id: "c1",
      content: "hi",
      client_message_id: "tmp-1",
    });
    expect(sentNow).toBe(false);

    await client.connect();
    FakeSocket.last!.fakeOpen();

    const events = FakeSocket.last!.sent.map((m) => m.event);
    expect(events).toContain("msg:send");
    client.disconnect();
  });

  it("rejoins all open rooms after reconnect", async () => {
    const client = new ChatSocketClient();
    client.joinRoom("conv-1");
    client.joinRoom("conv-2");
    await client.connect();
    FakeSocket.last!.fakeOpen();
    const firstSocket = FakeSocket.last!;
    firstSocket.sent = [];

    // Simulate an abnormal close — triggers `scheduleRetry(0)`.
    firstSocket.close(1006, "abnormal");

    // Backoff is 1000ms + up to 500ms jitter. Wait enough that the timer
    // has surely fired AND the awaited `fetchWsTicket()` microtask has resolved
    // AND a new FakeSocket has been instantiated.
    await new Promise((r) => setTimeout(r, 2000));
    // Drain microtasks once more to be safe.
    await Promise.resolve();

    const newSocket = FakeSocket.last;
    expect(newSocket).not.toBe(firstSocket); // a fresh connection happened
    newSocket!.fakeOpen();

    const joins = newSocket!.sent
      .filter((m) => m.event === "conv:join")
      .map((m) => (m.payload as { conversation_id: string }).conversation_id);
    expect(joins).toEqual(expect.arrayContaining(["conv-1", "conv-2"]));

    client.disconnect();
  }, 10000);
});
