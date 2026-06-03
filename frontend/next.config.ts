import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import { assertFrontendEnvConfig } from "./src/lib/env";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

assertFrontendEnvConfig();

function normalizeAllowedDevOrigin(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return null;
    }
  }

  const candidate = trimmed.split("/")[0]?.split(":")[0]?.trim() ?? "";
  if (!candidate || !/^[*.a-z0-9-]+(\.[*.a-z0-9-]+)*$/i.test(candidate)) {
    return null;
  }

  return candidate;
}

function parseAllowedDevOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => normalizeAllowedDevOrigin(part.trim()))
    .filter((value): value is string => value !== null);
}

const allowedDevOrigins = Array.from(
  new Set(
    [
      "localhost",
      "127.0.0.1",
      // Next compares the request Origin hostname against this list for
      // dev-only assets/endpoints like /_next/webpack-hmr.
      normalizeAllowedDevOrigin(process.env.NEXT_PUBLIC_APP_URL),
      normalizeAllowedDevOrigin(process.env.OAUTH_GOOGLE_CALLBACK_URL),
      normalizeAllowedDevOrigin(process.env.OAUTH_GOOGLE_LINK_CALLBACK_URL),
      normalizeAllowedDevOrigin(process.env.OAUTH_GITHUB_CALLBACK_URL),
      normalizeAllowedDevOrigin(process.env.OAUTH_GITHUB_LINK_CALLBACK_URL),
      ...parseAllowedDevOrigins(process.env.ALLOWED_DEV_ORIGINS),
    ].filter((value): value is string => value !== null),
  ),
);

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // Report-only first: monitor violations before enforcing. Switch to
    // "Content-Security-Policy" once no violations are seen in the console.
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.unsplash.com https://unsplash.com https://randomuser.me https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://github.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    root: frontendRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "unsplash.com" },
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/u/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
