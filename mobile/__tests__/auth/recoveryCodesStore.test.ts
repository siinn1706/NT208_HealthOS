/**
 * Confirms the in-memory store for one-time MFA recovery codes is single-use
 * and refuses to leak codes through navigation params.
 */
import { consume, stash } from "@/auth/recoveryCodesStore";

describe("recoveryCodesStore", () => {
  it("returns the codes back to the consumer in order", () => {
    const codes = ["AAAA-AAAA", "BBBB-BBBB", "CCCC-CCCC"];
    const nonce = stash(codes);
    expect(consume(nonce)).toEqual(codes);
  });

  it("is single-use: consuming twice returns nothing the second time", () => {
    const nonce = stash(["one"]);
    expect(consume(nonce)).toEqual(["one"]);
    expect(consume(nonce)).toEqual([]);
  });

  it("returns empty when nonce is unknown / empty / undefined", () => {
    expect(consume(undefined)).toEqual([]);
    expect(consume(null)).toEqual([]);
    expect(consume("")).toEqual([]);
    expect(consume("not-a-real-nonce")).toEqual([]);
  });

  it("each stash returns a fresh nonce", () => {
    const a = stash(["a"]);
    const b = stash(["b"]);
    expect(a).not.toBe(b);
  });

  it("stores a copy, not the caller's array reference", () => {
    const codes = ["x"];
    const nonce = stash(codes);
    codes.push("y");
    expect(consume(nonce)).toEqual(["x"]);
  });
});
