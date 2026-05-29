import { describe, expect, it, vi, afterEach } from "vitest";
import { REQUEST_ID_HEADER, getOrCreateRequestId } from "@/lib/request-id";

const UUID_HEX_RE = /^[0-9a-f]{32}$/;

function makeReq(headers: Record<string, string> = {}): { headers: Headers } {
  const values = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    headers: {
      get: (name: string) => values.get(name.toLowerCase()) ?? null,
    } as Headers,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getOrCreateRequestId", () => {
  it("returns valid inbound id unchanged", () => {
    const req = makeReq({ [REQUEST_ID_HEADER]: "abc-123.OK" });
    expect(getOrCreateRequestId(req)).toBe("abc-123.OK");
  });

  it("generates 32-char hex when header absent", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "11111111-2222-3333-4444-555555555555"
    );
    const id = getOrCreateRequestId(makeReq());
    expect(id).toBe("11111111222233334444555555555555");
    expect(UUID_HEX_RE.test(id)).toBe(true);
  });

  it("replaces header containing injection chars", () => {
    const req = makeReq({ [REQUEST_ID_HEADER]: "$(rm -rf)\nINJECT" });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
    const id = getOrCreateRequestId(req);
    expect(id).toBe("aaaaaaaabbbbccccddddeeeeeeeeeeee");
    expect(id).not.toContain("rm");
  });

  it("replaces id longer than 128 chars", () => {
    const long = "a".repeat(129);
    const req = makeReq({ [REQUEST_ID_HEADER]: long });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "ffffffff-ffff-ffff-ffff-ffffffffffff"
    );
    const id = getOrCreateRequestId(req);
    expect(id).toBe("ffffffffffffffffffffffffffffffff");
  });

  it("accepts exactly 128 chars (boundary)", () => {
    const boundary = "a".repeat(128);
    expect(getOrCreateRequestId(makeReq({ [REQUEST_ID_HEADER]: boundary }))).toBe(boundary);
  });

  it("returns deterministic id for same valid header", () => {
    const req = makeReq({ [REQUEST_ID_HEADER]: "stable-id" });
    expect(getOrCreateRequestId(req)).toBe("stable-id");
    expect(getOrCreateRequestId(req)).toBe("stable-id");
  });
});
