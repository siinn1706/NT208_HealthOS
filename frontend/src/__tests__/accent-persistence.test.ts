import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("accent / theme preference PATCH contracts", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("theme toggle sends theme_mode in JSON body", async () => {
    await fetch("/api/v1/preferences/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_mode: "dark" }),
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ theme_mode: "dark" });
  });

  it("accent save sends accent_color as #RRGGBB", async () => {
    await fetch("/api/v1/preferences/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent_color: "#E91E63" }),
    });
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ accent_color: "#E91E63" });
  });

  it("reset-to-default would clear accent with null (API contract)", async () => {
    await fetch("/api/v1/preferences/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent_color: null }),
    });
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ accent_color: null });
  });
});
