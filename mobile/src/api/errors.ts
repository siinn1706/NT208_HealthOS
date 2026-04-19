/**
 * Mobile-side category. The backend uses many additional domain-specific codes
 * (INVALID_CREDENTIALS, OTP_INVALID, MFA_NOT_ENABLED, CHAT_FORBIDDEN, ...).
 * Those flow through unchanged via `ApiError.code`; this union only enumerates
 * the small set the mobile app explicitly branches on (auth flow + transport).
 */
export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "OFFLINE"
  | "UNKNOWN"
  // Allow any backend-provided string without losing autocomplete on the
  // known categories above.
  | (string & {});

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly fieldErrors: FieldError[];
  public readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 0,
    fieldErrors: FieldError[] = [],
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

function normalizeFieldErrors(input: unknown): FieldError[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const loc = obj.loc;
          const field =
            Array.isArray(loc) && loc.length > 0
              ? String(loc[loc.length - 1])
              : typeof obj.field === "string"
                ? obj.field
                : "form";
          const message =
            typeof obj.msg === "string"
              ? obj.msg
              : typeof obj.message === "string"
                ? obj.message
                : "Invalid value";
          return { field, message };
        }
        return null;
      })
      .filter((x): x is FieldError => x !== null);
  }
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    return Object.entries(obj).map(([field, msg]) => ({
      field,
      message: typeof msg === "string" ? msg : JSON.stringify(msg),
    }));
  }
  return [];
}

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "AUTH_EXPIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500 && status < 600) return "UPSTREAM_ERROR";
  return "UNKNOWN";
}

/**
 * Mirrors the BFF normalizer in frontend/src/lib/core-api-proxy.ts.
 * Handles FastAPI `detail`, nested `error`, bare `message`, and `field_errors`.
 */
export function normalizeError(status: number, body: unknown): ApiError {
  const fallbackMessage =
    status >= 500
      ? "We hit a snag. Please try again."
      : "Something went wrong.";

  if (!body || typeof body !== "object") {
    return new ApiError(statusToCode(status), fallbackMessage, status);
  }

  const obj = body as Record<string, unknown>;

  if (obj.error && typeof obj.error === "object") {
    const errObj = obj.error as Record<string, unknown>;
    const code = (typeof errObj.code === "string"
      ? (errObj.code as ApiErrorCode)
      : statusToCode(status)) as ApiErrorCode;
    const message =
      typeof errObj.message === "string" ? errObj.message : fallbackMessage;
    const fieldErrors = normalizeFieldErrors(errObj.field_errors);
    return new ApiError(code, message, status, fieldErrors, errObj.details);
  }

  if (obj.detail !== undefined) {
    if (typeof obj.detail === "string") {
      return new ApiError(statusToCode(status), obj.detail, status);
    }
    if (Array.isArray(obj.detail)) {
      return new ApiError(
        "VALIDATION",
        "Please correct the highlighted fields.",
        status,
        normalizeFieldErrors(obj.detail)
      );
    }
    if (typeof obj.detail === "object") {
      const detail = obj.detail as Record<string, unknown>;
      const message =
        typeof detail.message === "string"
          ? detail.message
          : fallbackMessage;
      const fieldErrors = normalizeFieldErrors(
        detail.field_errors ?? detail.errors
      );
      const code =
        typeof detail.code === "string"
          ? (detail.code as ApiErrorCode)
          : statusToCode(status);
      return new ApiError(code, message, status, fieldErrors, detail);
    }
  }

  if (typeof obj.message === "string") {
    return new ApiError(
      statusToCode(status),
      obj.message,
      status,
      normalizeFieldErrors(obj.field_errors)
    );
  }

  return new ApiError(statusToCode(status), fallbackMessage, status);
}
