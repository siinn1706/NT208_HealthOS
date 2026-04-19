import { env } from "@/config/env";
import { ApiError, normalizeError } from "./errors";
import { sessionStore } from "@/auth/session";
import { appEvents } from "./events";

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRY_STATUSES = new Set([502, 503, 504]);

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean;
  timeoutMs?: number;
  retry?: boolean;
}

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const base = env.coreApiUrl.replace(/\/$/, "");
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  if (!query) return `${base}${cleanedPath}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}${cleanedPath}?${qs}` : `${base}${cleanedPath}`;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  if (contentType.startsWith("text/")) {
    return await response.text();
  }
  return null;
}

async function executeOnce<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onAbort);
  }

  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        if (externalSignal?.aborted) {
          throw new ApiError("UNKNOWN", "Request cancelled", 0);
        }
        throw new ApiError(
          "UPSTREAM_TIMEOUT",
          "The request took too long. Please try again.",
          0
        );
      }
      throw new ApiError(
        "UPSTREAM_UNAVAILABLE",
        "Unable to reach the server. Check your connection.",
        0,
        [],
        err
      );
    }

    const body = await parseBody(response);

    if (response.ok) {
      return body as T;
    }

    const error = normalizeError(response.status, body);

    if (response.status === 401) {
      appEvents.emit("auth:expired", { reason: "401" });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onAbort);
    }
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    headers = {},
    signal,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retry = method === "GET",
  } = options;

  const session = sessionStore.getState();
  if (auth && !session.token) {
    throw new ApiError("AUTH_REQUIRED", "You must sign in to continue.", 401);
  }

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  let finalBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      finalBody = body;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      finalBody = JSON.stringify(body);
    }
  }

  if (auth && session.token) {
    finalHeaders.Authorization = `Bearer ${session.token}`;
  }

  const init: RequestInit = {
    method,
    headers: finalHeaders,
    body: finalBody,
  };

  const url = buildUrl(path, query);

  try {
    return await executeOnce<T>(url, init, timeoutMs, signal);
  } catch (err) {
    if (
      retry &&
      err instanceof ApiError &&
      (RETRY_STATUSES.has(err.status) ||
        err.code === "UPSTREAM_UNAVAILABLE" ||
        err.code === "UPSTREAM_TIMEOUT")
    ) {
      await new Promise((r) => setTimeout(r, 800));
      return executeOnce<T>(url, init, timeoutMs, signal);
    }
    throw err;
  }
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: Omit<ApiFetchOptions, "body" | "method"> & {
    method?: "POST" | "PATCH" | "PUT";
  } = {}
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: options.method ?? "POST",
    body: formData,
    retry: false,
  });
}

export function unwrapData<T>(payload: { data: T } | T): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as object) &&
    !Array.isArray(payload)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
