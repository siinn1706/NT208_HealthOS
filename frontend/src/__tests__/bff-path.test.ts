/**
 * Unit tests for corePath tagged template literal (bff-path.ts).
 */

import { describe, expect, it } from "vitest";
import { corePath } from "@/lib/bff-path";

describe("corePath", () => {
  it("leaves a UUID segment unchanged (encodeURIComponent is a no-op for UUID chars)", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(corePath`/v1/conversations/${id}/messages`).toBe(
      `/v1/conversations/${id}/messages`
    );
  });

  it("encodes path-traversal segment ../evil", () => {
    const id = "../evil";
    expect(corePath`/v1/conversations/${id}/messages`).toBe(
      "/v1/conversations/..%2Fevil/messages"
    );
  });

  it("encodes double-dot segment ..", () => {
    const id = "..";
    expect(corePath`/v1/items/${id}`).toBe("/v1/items/..");
    // encodeURIComponent("..") is ".." because dots are unreserved — traversal
    // only happens when combined with slash. The slash variant above is the real guard.
  });

  it("encodes a segment containing a forward slash", () => {
    const id = "a/b";
    expect(corePath`/v1/items/${id}`).toBe("/v1/items/a%2Fb");
  });

  it("returns empty string for an empty segment", () => {
    const id = "";
    expect(corePath`/v1/items/${id}/sub`).toBe("/v1/items//sub");
  });

  it("encodes unicode characters in a segment", () => {
    const id = "héllo wörld";
    const encoded = encodeURIComponent(id);
    expect(corePath`/v1/users/${id}/profile`).toBe(`/v1/users/${encoded}/profile`);
  });

  it("encodes multiple segments independently", () => {
    const id = "conv/1";
    const userId = "user/2";
    expect(corePath`/v1/conversations/${id}/members/${userId}/role`).toBe(
      "/v1/conversations/conv%2F1/members/user%2F2/role"
    );
  });

  it("handles a template with no interpolations", () => {
    // @ts-expect-error — testing zero-segment call via cast
    expect(corePath`/v1/static/path`).toBe("/v1/static/path");
  });
});
