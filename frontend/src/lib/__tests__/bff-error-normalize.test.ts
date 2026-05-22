/**
 * Unit tests for bff-error-normalize.ts — Core 429 normalization (RT-12).
 */
import { describe, expect, it } from "vitest";
import { normalizeCoreError } from "@/lib/bff-error-normalize";
import { parseApiError } from "@/types/api-error";

describe("normalizeCoreError", () => {
  it("passes through already-canonical BFF shape", () => {
    const result = normalizeCoreError(
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests." } },
      429,
    );
    expect(result).toEqual({
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests." },
    });
  });

  it("normalizes FastAPI { detail: { code, message } } shape", () => {
    const result = normalizeCoreError(
      { detail: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." } },
      429,
    );
    expect(result).toEqual({
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
    });
  });

  it("normalizes FastAPI { detail: 'string' } shape", () => {
    const result = normalizeCoreError({ detail: "Too many requests" }, 429);
    expect(result.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(result.error.message).toBe("Too many requests");
  });

  it("falls back to status-derived code and message for null input", () => {
    const result = normalizeCoreError(null, 429);
    expect(result.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(result.error.message).toBeTruthy();
  });

  it("uses status-derived code for unknown shape", () => {
    const result = normalizeCoreError({ something: "weird" }, 429);
    expect(result.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});

describe("parser-equivalence (RT-12): parseApiError handles both shapes", () => {
  it("extracts same code from Core-shape 429", () => {
    const coreShape = { detail: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều..." } };
    const parsed = parseApiError(coreShape);
    expect(parsed.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("extracts same code from BFF-shape 429", () => {
    const bffShape = { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } };
    const parsed = parseApiError(bffShape);
    expect(parsed.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("Core-shape and BFF-shape yield identical code after normalization", () => {
    const coreShape = { detail: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều..." } };
    const bffShape = normalizeCoreError(coreShape, 429);
    expect(parseApiError(coreShape).code).toBe(parseApiError(bffShape).code);
  });
});
