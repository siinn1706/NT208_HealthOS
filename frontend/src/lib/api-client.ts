/**
 * BFF API Client — typed fetch helper for Client Components.
 *
 * Usage (in Client Component):
 *   import { bffFetch } from "@/lib/api-client";
 *   const data = await bffFetch("/api/v1/health-data?range=30d");
 *
 * Rule: Client components call BFF (/api/v1/...), NOT Core BE directly.
 * Server components can call BFF routes directly via fetch or import handlers.
 */

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
};

type BffFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  revalidate?: number | false;
};

export async function bffFetch<T = unknown>(
  path: string,
  options: BffFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, revalidate = 0 } = options;

  const res = await fetch(path, {
    method,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: revalidate !== false ? { revalidate } : undefined,
  });

  if (!res.ok) {
    // Redirect to login on session expiry (client-side only)
    if (res.status === 401 && typeof window !== "undefined") {
      const from = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?from=${from}`;
      return new Promise<T>(() => {});
    }
    const error = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: res.statusText } }));
    throw new BffError(res.status, error?.error?.code ?? "UNKNOWN", error?.error?.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export class BffError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "BffError";
  }
}

/**
 * Client-safe BFF fetch utility for "use client" components.
 * Uses credentials: "include" to send session cookies.
 * Returns { data, error } instead of throwing.
 */
export async function bffFetchClient(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: unknown; error?: unknown }> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      const from = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?from=${from}`;
      return { error: { code: "SESSION_EXPIRED" } };
    }
    const err = await res.json().catch(() => ({}));
    return { error: err };
  }
  return { data: await res.json() };
}
