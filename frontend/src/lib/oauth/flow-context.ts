import type { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_SECURE } from "@/lib/bff-auth-cookie";
import { routing } from "@/i18n/routing";
import { stripLocalePrefix } from "@/lib/locale-path";
import { getSafePostLoginRedirectPath } from "@/lib/safe-post-login-redirect";

const DEFAULT_APP_ORIGIN = "http://localhost:3000";

export type OAuthProvider = "google" | "github";
export type OAuthFlow = "signin" | "link";

export interface OAuthContext {
  initiatedOrigin: string;
  locale: string;
  postLoginPath: string | null;
}

const OAUTH_CONTEXT_COOKIE_NAMES: Record<
  OAuthProvider,
  Record<OAuthFlow, string>
> = {
  google: {
    signin: "oauth_context_google",
    link: "oauth_link_context_google",
  },
  github: {
    signin: "oauth_context_github",
    link: "oauth_link_context_github",
  },
};

function getFirstHeaderValue(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first ? first : null;
}

function normalizeAbsoluteUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function isKnownLocale(raw: string | null | undefined): raw is string {
  return (
    typeof raw === "string" &&
    (routing.locales as readonly string[]).includes(raw)
  );
}

function inferProtocol(host: string): string {
  if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
    return "http";
  }
  return "https";
}

export function resolveOAuthLocale(raw: string | null | undefined): string {
  return isKnownLocale(raw) ? raw : routing.defaultLocale;
}

export function normalizeOAuthPostLoginPath(
  raw: string | null | undefined,
): string | null {
  const safe = getSafePostLoginRedirectPath(raw ?? null);
  return safe ? stripLocalePrefix(safe) : null;
}

export function resolvePublicOrigin(
  request: Pick<Request, "headers" | "url">,
  fallbackUrls: Array<string | null | undefined> = [],
): string {
  const forwardedHost =
    getFirstHeaderValue(request.headers.get("x-forwarded-host")) ??
    getFirstHeaderValue(request.headers.get("host"));
  const requestUrl = normalizeAbsoluteUrl(request.url);

  if (forwardedHost) {
    const protocol =
      getFirstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      requestUrl?.protocol.replace(/:$/, "") ??
      inferProtocol(forwardedHost);
    return `${protocol}://${forwardedHost}`;
  }

  if (requestUrl) {
    return requestUrl.origin;
  }

  for (const candidate of fallbackUrls) {
    const parsed = normalizeAbsoluteUrl(candidate);
    if (parsed) return parsed.origin;
  }

  return DEFAULT_APP_ORIGIN;
}

function buildAbsoluteUrl(origin: string, pathname: string): string {
  return new URL(pathname, origin).toString();
}

function shouldUseSecureCookie(request: Pick<Request, "headers" | "url">): boolean {
  if (!SESSION_COOKIE_SECURE) {
    return false;
  }
  return resolvePublicOrigin(request).startsWith("https://");
}

export function buildOAuthCallbackUrl(
  request: Pick<Request, "headers" | "url">,
  callbackPath: string,
  fallbackUrls: Array<string | null | undefined> = [],
): string {
  return buildAbsoluteUrl(resolvePublicOrigin(request, fallbackUrls), callbackPath);
}

export function getOAuthContextCookieName(
  provider: OAuthProvider,
  flow: OAuthFlow,
): string {
  return OAUTH_CONTEXT_COOKIE_NAMES[provider][flow];
}

export function encodeOAuthContext(context: OAuthContext): string {
  return Buffer.from(JSON.stringify(context), "utf-8").toString("base64url");
}

export function decodeOAuthContext(
  raw: string | null | undefined,
): OAuthContext | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8"),
    ) as Partial<OAuthContext>;
    return {
      initiatedOrigin:
        normalizeAbsoluteUrl(parsed.initiatedOrigin)?.origin ?? DEFAULT_APP_ORIGIN,
      locale: resolveOAuthLocale(parsed.locale),
      postLoginPath: normalizeOAuthPostLoginPath(parsed.postLoginPath),
    };
  } catch {
    return null;
  }
}

export function createOAuthContext(
  request: Pick<Request, "headers" | "url">,
  params: {
    locale?: string | null;
    postLoginPath?: string | null;
  },
  fallbackUrls: Array<string | null | undefined> = [],
): OAuthContext {
  return {
    initiatedOrigin: resolvePublicOrigin(request, fallbackUrls),
    locale: resolveOAuthLocale(params.locale),
    postLoginPath: normalizeOAuthPostLoginPath(params.postLoginPath),
  };
}

export function getOAuthCookieOptions(
  request: Pick<Request, "headers" | "url">,
  maxAge: number,
) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export function setOAuthContextCookie(
  response: NextResponse,
  request: NextRequest,
  provider: OAuthProvider,
  flow: OAuthFlow,
  context: OAuthContext,
  maxAge: number,
): void {
  response.cookies.set(
    getOAuthContextCookieName(provider, flow),
    encodeOAuthContext(context),
    getOAuthCookieOptions(request, maxAge),
  );
}

export function readOAuthContext(
  request: NextRequest,
  provider: OAuthProvider,
  flow: OAuthFlow,
  fallbackUrls: Array<string | null | undefined> = [],
): OAuthContext {
  return (
    decodeOAuthContext(
      request.cookies.get(getOAuthContextCookieName(provider, flow))?.value,
    ) ??
    createOAuthContext(
      request,
      {
        locale: null,
        postLoginPath: null,
      },
      fallbackUrls,
    )
  );
}

export function clearOAuthCookies(
  response: NextResponse,
  cookieNames: string[],
): void {
  cookieNames.forEach((cookieName) => response.cookies.delete(cookieName));
}

export function buildLocalizedAppUrl(
  context: OAuthContext,
  pathname: string,
  params: Record<string, string> = {},
): string {
  const normalized = stripLocalePrefix(pathname.startsWith("/") ? pathname : `/${pathname}`);
  const localizedPath =
    normalized === "/"
      ? `/${context.locale}`
      : `/${context.locale}${normalized}`;
  const url = new URL(localizedPath, context.initiatedOrigin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export function buildOAuthCallbackUrlFromContext(
  context: OAuthContext | null,
  request: Pick<Request, "headers" | "url">,
  callbackPath: string,
  fallbackUrls: Array<string | null | undefined> = [],
): string {
  const origin = context?.initiatedOrigin ?? resolvePublicOrigin(request, fallbackUrls);
  return buildAbsoluteUrl(origin, callbackPath);
}
