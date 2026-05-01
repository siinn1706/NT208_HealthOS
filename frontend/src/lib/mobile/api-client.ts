import { bffFetch, BffError } from "@/lib/api-client";

export type MobileApiError = {
  status: number;
  code: string;
  message: string;
};

export type MobileResourceState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "empty"; data: T; error: null }
  | { status: "error"; data: null; error: MobileApiError };

export async function mobileBffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return bffFetch<T>(path, {
    method: init?.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | undefined,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    headers: init?.headers,
    revalidate: false,
  });
}

export function toMobileApiError(error: unknown): MobileApiError {
  if (error instanceof BffError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { status: 408, code: "REQUEST_TIMEOUT", message: "Request timed out. Please try again." };
  }
  if (error instanceof Error) {
    return { status: 0, code: "CLIENT_ERROR", message: error.message };
  }
  return { status: 0, code: "UNKNOWN", message: "Something went wrong." };
}
