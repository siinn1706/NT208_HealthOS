/**
 * Normalize upstream error payloads to the canonical BFF error shape.
 *
 * Accepts:
 *   { error: { code, message } }           — already canonical, passthrough
 *   { detail: { code, message } }          — FastAPI HTTPException shape
 *   { detail: "string" }                   — FastAPI default string detail
 *   null / unknown                         — fallback with status-derived code
 *
 * Used by direct-fetch auth routes (those that don't go through coreProxy)
 * so Core 429 bodies are normalized before being returned to the browser (RT-12).
 */

function codeForStatus(status: number): string {
  if (status === 429) return "RATE_LIMIT_EXCEEDED";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "VALIDATION_FAILED";
  if (status >= 400 && status < 500) return "CLIENT_ERROR";
  return "UPSTREAM_ERROR";
}

function messageForStatus(status: number): string {
  if (status === 429) return "Too many requests. Please try again later.";
  if (status === 401) return "Authentication required.";
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  return "An error occurred.";
}

export interface NormalizedError {
  error: { code: string; message: string };
}

export function normalizeCoreError(data: unknown, status: number): NormalizedError {
  const fallbackCode = codeForStatus(status);
  const fallbackMessage = messageForStatus(status);

  if (!data || typeof data !== "object") {
    return { error: { code: fallbackCode, message: fallbackMessage } };
  }

  const obj = data as Record<string, unknown>;

  // Already canonical BFF shape
  if (obj.error && typeof obj.error === "object") {
    const e = obj.error as Record<string, unknown>;
    return {
      error: {
        code: typeof e.code === "string" && e.code ? e.code : fallbackCode,
        message: typeof e.message === "string" && e.message ? e.message : fallbackMessage,
      },
    };
  }

  // FastAPI HTTPException: { detail: { code, message } }
  if ("detail" in obj) {
    const detail = obj.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const d = detail as Record<string, unknown>;
      return {
        error: {
          code: typeof d.code === "string" && d.code ? d.code : fallbackCode,
          message: typeof d.message === "string" && d.message ? d.message : fallbackMessage,
        },
      };
    }
    if (typeof detail === "string" && detail) {
      return { error: { code: fallbackCode, message: detail } };
    }
  }

  return { error: { code: fallbackCode, message: fallbackMessage } };
}
