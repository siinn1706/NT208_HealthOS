type BrowserLocation = Pick<Location, "protocol" | "host">;

// Prefers NEXT_PUBLIC_WS_URL; falls back to legacy NEXT_PUBLIC_CORE_WS_URL with a dev
// deprecation warning. Uses || not ?? so empty-string Docker build-arg injections fall through.
export function readWebSocketEnv(): string | undefined {
  const fresh = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fresh) return fresh;
  const legacy = process.env.NEXT_PUBLIC_CORE_WS_URL?.trim();
  if (legacy && process.env.NODE_ENV !== "production") {
    console.warn(
      "[deprecation 2026-09-01] NEXT_PUBLIC_CORE_WS_URL → NEXT_PUBLIC_WS_URL",
    );
  }
  return legacy;
}

function getBrowserLocation(): BrowserLocation | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.location;
}

function sameOriginWsBase(location: BrowserLocation | null): string {
  if (!location) {
    // SSR: no window → return empty string so callers fail loudly (WebSocket("") throws)
    return "";
  }
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;
}

function hasProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("127.")
  );
}

export function resolveWebSocketBase(
  configuredBase?: string | null,
  location: BrowserLocation | null = getBrowserLocation(),
): string {
  const fallback = sameOriginWsBase(location);
  const rawBase = configuredBase?.trim();

  if (!rawBase) {
    return fallback;
  }

  const candidate = rawBase.startsWith("//")
    ? `${location?.protocol ?? "http:"}${rawBase}`
    : hasProtocol(rawBase)
      ? rawBase
      : `${location?.protocol ?? "http:"}//${rawBase}`;

  try {
    const url = new URL(candidate);

    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return fallback;
    }

    // Loopback on HTTPS → route to same-origin gateway instead of direct Core
    if (location?.protocol === "https:" && isLoopbackHost(url.hostname)) {
      return fallback;
    }

    // ws:// on HTTPS is insecure and rejected by browsers; throw so it's loud
    if (location?.protocol === "https:" && url.protocol === "ws:") {
      throw new Error(
        "Insecure WS URL: ws:// on https:// page is rejected — use wss://",
      );
    }

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Insecure WS URL")) {
      throw err;
    }
    return fallback;
  }
}

/** @deprecated Use resolveWebSocketBase. Removed 2026-09-01. */
export const resolveCoreWebSocketBase = resolveWebSocketBase;
