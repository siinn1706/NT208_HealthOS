/**
 * Validates the FastAPI error normalizer against every shape Core BE actually
 * returns (per backend/app/main.py exception handlers and inline raises).
 */
import { ApiError, normalizeError } from "@/api/errors";

describe("normalizeError", () => {
  it("handles the canonical { error: { code, message } } envelope", () => {
    const e = normalizeError(401, {
      error: { code: "INVALID_CREDENTIALS", message: "Wrong password" },
    });
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe("INVALID_CREDENTIALS");
    expect(e.message).toBe("Wrong password");
    expect(e.status).toBe(401);
  });

  it("maps validation envelopes with field_errors object", () => {
    const e = normalizeError(422, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        field_errors: { email: "Email is required" },
      },
    });
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.fieldErrors).toEqual([
      { field: "email", message: "Email is required" },
    ]);
  });

  it("falls back to FastAPI raw `detail` string", () => {
    const e = normalizeError(413, { detail: "File too large." });
    expect(e.message).toBe("File too large.");
    expect(e.status).toBe(413);
  });

  it("treats `detail` as Pydantic validation array", () => {
    const e = normalizeError(422, {
      detail: [
        { loc: ["body", "email"], msg: "value is not a valid email" },
        { loc: ["body", "password"], msg: "too short" },
      ],
    });
    expect(e.code).toBe("VALIDATION");
    expect(e.fieldErrors).toEqual([
      { field: "email", message: "value is not a valid email" },
      { field: "password", message: "too short" },
    ]);
  });

  it("handles `detail` as object with nested code/message/field_errors", () => {
    const e = normalizeError(409, {
      detail: {
        code: "EMAIL_TAKEN",
        message: "Email đã được sử dụng",
        field_errors: { email: "Already taken" },
      },
    });
    expect(e.code).toBe("EMAIL_TAKEN");
    expect(e.message).toBe("Email đã được sử dụng");
    expect(e.fieldErrors).toEqual([{ field: "email", message: "Already taken" }]);
  });

  it("falls back to status-based code on bare body", () => {
    const e404 = normalizeError(404, {});
    expect(e404.code).toBe("NOT_FOUND");
    const e429 = normalizeError(429, {});
    expect(e429.code).toBe("RATE_LIMITED");
    const e500 = normalizeError(500, null);
    expect(e500.code).toBe("UPSTREAM_ERROR");
  });

  it("preserves unknown backend codes verbatim", () => {
    const e = normalizeError(401, {
      error: { code: "ACCOUNT_LOCKED", message: "Locked for 15 minutes" },
    });
    expect(e.code).toBe("ACCOUNT_LOCKED");
  });

  it("provides a friendly fallback message for 5xx", () => {
    const e = normalizeError(503, null);
    expect(e.message).toMatch(/snag|try again/i);
  });
});
