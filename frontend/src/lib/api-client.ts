/**
 * BFF API Client — typed fetch helper for Client Components.
 *
 * Usage (in Client Component):
 *   import { bffFetch } from "@/lib/api-client";
 *   const data = await bffFetch("/api/v1/dashboard/summary");
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

/** Default client-side BFF request timeout in milliseconds. */
const BFF_FETCH_TIMEOUT_MS = 30_000;

async function readResponseBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;

  const text = await res.text();
  if (!text.trim()) return undefined;

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  const looksJson = contentType.includes("application/json") || /^[\s\n\r]*[\[{]/.test(text);
  if (!looksJson) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function fallbackClientError(res: Response, body: unknown): { error: { code: string; message: string } } {
  const message =
    typeof body === "string" && body.trim()
      ? body
      : res.statusText || "Request failed.";
  return { error: { code: "UNKNOWN", message } };
}

export async function bffFetch<T = unknown>(
  path: string,
  options: BffFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, revalidate = 0 } = options;

  // Only apply AbortController timeout in browser contexts; Node RSC fetch
  // uses the `next` cache option which handles its own lifecycle.
  const controller = typeof window !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), BFF_FETCH_TIMEOUT_MS)
    : null;

  const res = await fetch(path, {
    method,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: revalidate !== false ? { revalidate } : undefined,
    signal: controller?.signal,
  });
  if (timeoutId !== null) clearTimeout(timeoutId);

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
    const body = await readResponseBody(res).catch(() => undefined);
    return { error: body && typeof body === "object" ? body : fallbackClientError(res, body) };
  }
  return { data: await readResponseBody(res) };
}
