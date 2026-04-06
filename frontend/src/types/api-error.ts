/**
 * API Error Response Types
 * Standardized error contract for all API responses
 */

export interface ApiFieldError {
  message: string;
  code?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string | Record<string, unknown>;
  field_errors?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_FORMAT: "INVALID_FORMAT",
  FIELD_CONSTRAINT_VIOLATION: "FIELD_CONSTRAINT_VIOLATION",

  // Auth errors
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  USERNAME_ALREADY_EXISTS: "USERNAME_ALREADY_EXISTS",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_ALREADY_VERIFIED: "OTP_ALREADY_VERIFIED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",

  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Parse API error response
 */
export function parseApiError(response: unknown): ApiError {
  if (!response || typeof response !== "object") {
    return {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: "Đã xảy ra lỗi không xác định",
    };
  }

  const data = response as Record<string, unknown>;

  // Standard error format
  if (data.error && typeof data.error === "object") {
    const error = data.error as Record<string, unknown>;
    return {
      code: (error.code as string) || ErrorCodes.UNKNOWN_ERROR,
      message: (error.message as string) || "Đã xảy ra lỗi",
      details: error.details as string | undefined,
      field_errors: error.field_errors as Record<string, string> | undefined,
    };
  }

  // Fallback: FastAPI { "detail": { code, message } } or { "detail": "string" }
  if (data.detail) {
    if (typeof data.detail === "object") {
      const det = data.detail as Record<string, unknown>;
      return {
        code: (det.code as string) || ErrorCodes.UNKNOWN_ERROR,
        message: (det.message as string) || "Đã xảy ra lỗi",
        details: det.details as string | undefined,
        field_errors: det.field_errors as Record<string, string> | undefined,
      };
    }
    return {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: String(data.detail),
    };
  }

  if (data.message) {
    return {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: String(data.message),
    };
  }

  return {
    code: ErrorCodes.UNKNOWN_ERROR,
    message: "Đã xảy ra lỗi không xác định",
  };
}

/**
 * Get user-friendly error message based on error code
 */
export function getErrorMessage(errorCode: string, fallbackMessage?: string): string {
  const errorMessages: Record<string, string> = {
    // Validation
    [ErrorCodes.VALIDATION_FAILED]: "Dữ liệu không hợp lệ",
    [ErrorCodes.REQUIRED_FIELD_MISSING]: "Vui lòng điền đầy đủ thông tin bắt buộc",
    [ErrorCodes.INVALID_FORMAT]: "Định dạng không đúng",
    [ErrorCodes.FIELD_CONSTRAINT_VIOLATION]: "Dữ liệu không đúng quy định",

    // Auth
    [ErrorCodes.INVALID_CREDENTIALS]: "Tên đăng nhập hoặc mật khẩu không đúng",
    [ErrorCodes.USER_NOT_FOUND]: "Không tìm thấy người dùng",
    [ErrorCodes.USER_ALREADY_EXISTS]: "Tài khoản đã tồn tại",
    [ErrorCodes.EMAIL_ALREADY_EXISTS]: "Email đã được sử dụng",
    [ErrorCodes.USERNAME_ALREADY_EXISTS]: "Tên đăng nhập đã được sử dụng",
    [ErrorCodes.OTP_INVALID]: "Mã OTP không đúng",
    [ErrorCodes.OTP_EXPIRED]: "Mã OTP đã hết hạn",
    [ErrorCodes.OTP_ALREADY_VERIFIED]: "Mã OTP đã được xác thực",
    [ErrorCodes.TOKEN_EXPIRED]: "Phiên đăng nhập đã hết hạn",
    [ErrorCodes.TOKEN_INVALID]: "Phiên đăng nhập không hợp lệ",
    [ErrorCodes.SESSION_EXPIRED]: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
    [ErrorCodes.UNAUTHORIZED]: "Bạn cần đăng nhập để tiếp tục",

    // Rate limiting
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: "Thao tác quá nhanh, vui lòng thử lại sau",
    [ErrorCodes.TOO_MANY_REQUESTS]: "Vui lòng chờ một lát rồi thử lại",

    // Server
    [ErrorCodes.INTERNAL_SERVER_ERROR]: "Máy chủ đang bận, vui lòng thử lại sau",
    [ErrorCodes.SERVICE_UNAVAILABLE]: "Dịch vụ tạm thời không khả dụng",
    [ErrorCodes.DATABASE_ERROR]: "Lỗi cơ sở dữ liệu",

    // Network
    [ErrorCodes.NETWORK_ERROR]: "Không thể kết nối máy chủ",
    [ErrorCodes.TIMEOUT_ERROR]: "Yêu cầu hết thời gian chờ",
  };

  return errorMessages[errorCode] || fallbackMessage || "Đã xảy ra lỗi";
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

/**
 * Check if error is an auth error (needs redirect to login)
 */
export function isAuthError(errorCode: string): boolean {
  const authErrors = [
    ErrorCodes.UNAUTHORIZED,
    ErrorCodes.TOKEN_EXPIRED,
    ErrorCodes.TOKEN_INVALID,
    ErrorCodes.SESSION_EXPIRED,
    ErrorCodes.INVALID_CREDENTIALS,
  ];
  return authErrors.includes(errorCode as typeof authErrors[number]);
}
