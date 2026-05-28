type BrowserLocation = Pick<Location, "protocol" | "host">;

function getBrowserLocation(): BrowserLocation | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.location;
}

function sameOriginWsBase(location: BrowserLocation | null): string {
  if (!location) {
    return "ws://localhost:8000";
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

export function resolveCoreWebSocketBase(
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

    if (location?.protocol === "https:" && isLoopbackHost(url.hostname)) {
      return fallback;
    }

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
