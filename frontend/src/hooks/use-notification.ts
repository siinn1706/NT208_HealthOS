"use client";

import { toast } from "sonner";
import { parseApiError, getErrorMessage, isNetworkError } from "@/types/api-error";

/**
 * Notification types
 */
export type NotificationType = "success" | "error" | "warning" | "info";

/**
 * Notification options
 */
interface NotificationOptions {
  /**
   * Duration in milliseconds (default: 4000)
   */
  duration?: number;

  /**
   * Whether to dismiss on action click (default: true)
   */
  dismissible?: boolean;

  /**
   * Custom action buttons
   */
  action?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Description text (for complex messages)
   */
  description?: string;
}

/**
 * Notification hook for showing toast messages
 */
export function useNotification() {
  /**
   * Show success notification
   */
  const success = (message: string, options?: NotificationOptions) => {
    toast.success(message, {
      duration: options?.duration ?? 4000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
      description: options?.description,
    });
  };

  /**
   * Show error notification
   */
  const error = (message: string, options?: NotificationOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 5000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
      description: options?.description,
    });
  };

  /**
   * Show warning notification
   */
  const warning = (message: string, options?: NotificationOptions) => {
    toast.warning(message, {
      duration: options?.duration ?? 4000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
      description: options?.description,
    });
  };

  /**
   * Show info notification
   */
  const info = (message: string, options?: NotificationOptions) => {
    toast.info(message, {
      duration: options?.duration ?? 4000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
      description: options?.description,
    });
  };

  /**
   * Show loading/promise notification
   */
  const loading = (message: string) => {
    return toast.loading(message);
  };

  /**
   * Handle API error response
   * Returns field errors if available
   */
  const handleApiError = (
    response: unknown,
    fallbackMessage?: string
  ): Record<string, string> => {
    const apiError = parseApiError(response);
    const message = getErrorMessage(apiError.code, fallbackMessage || apiError.message);

    // If there are field errors, return them for inline display
    if (apiError.field_errors && Object.keys(apiError.field_errors).length > 0) {
      // Show main error toast with longer duration
      if (message) {
        error(message, { duration: 6000 });
      }
      return apiError.field_errors;
    }

    // No field errors, show regular error toast
    error(message, { duration: 6000 });
    return {};
  };

  /**
   * Handle generic error (network, unexpected)
   */
  const handleError = (err: unknown, fallbackMessage?: string) => {
    // Network error
    if (isNetworkError(err)) {
      error("Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.", {
        duration: 8000,
      });
      return {};
    }

    // Try to parse as API error
    if (err && typeof err === "object") {
      const fieldErrors = handleApiError(err, fallbackMessage);
      if (Object.keys(fieldErrors).length > 0) {
        return fieldErrors;
      }
    }

    // Generic fallback
    error(fallbackMessage || "Đã xảy ra lỗi. Vui lòng thử lại.", {
      duration: 6000,
    });
    return {};
  };

  /**
   * Show success with optional description
   */
  const successWithDescription = (title: string, description?: string) => {
    toast.success(title, { description });
  };

  /**
   * Show error with optional description
   */
  const errorWithDescription = (title: string, description?: string) => {
    toast.error(title, { description });
  };

  /**
   * Dismiss all toasts
   */
  const dismissAll = () => {
    toast.dismiss();
  };

  /**
   * Promise-based toast handler for async operations
   */
  const promise = <T>(
    promiseFn: () => Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promiseFn, messages);
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    handleApiError,
    handleError,
    successWithDescription,
    errorWithDescription,
    dismissAll,
    promise,
  };
}

/**
 * Inline validation helper
 * Maps API field errors to form fields
 */
export function mapFieldErrors(
  fieldErrors: Record<string, string>,
  fieldMapping: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [apiField, errorMessage] of Object.entries(fieldErrors)) {
    // Map API field name to form field name
    const formField = fieldMapping[apiField] || apiField;
    result[formField] = errorMessage;
  }

  return result;
}

/**
 * Validation error messages (Vietnamese)
 */
export const ValidationMessages = {
  required: (fieldName: string) => `${fieldName} là bắt buộc`,
  email: "Email không hợp lệ",
  phone: "Số điện thoại không hợp lệ",
  minLength: (fieldName: string, min: number) =>
    `${fieldName} phải có ít nhất ${min} ký tự`,
  maxLength: (fieldName: string, max: number) =>
    `${fieldName} không được quá ${max} ký tự`,
  pattern: (fieldName: string) => `${fieldName} không đúng định dạng`,
  min: (fieldName: string, min: number) =>
    `${fieldName} phải lớn hơn hoặc bằng ${min}`,
  max: (fieldName: string, max: number) =>
    `${fieldName} phải nhỏ hơn hoặc bằng ${max}`,
  username: "Username phải có 3-20 ký tự, chỉ chứa chữ cái, số và dấu gạch dưới",
  password: "Mật khẩu phải có ít nhất 8 ký tự",
  passwordMismatch: "Mật khẩu không khớp",
  date: "Ngày không hợp lệ",
  url: "URL không hợp lệ",
} as const;
