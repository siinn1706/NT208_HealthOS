/**
 * Multipart proxy helper.
 *
 * Thin wrapper around `coreProxy` for BFF route handlers that forward binary
 * uploads (meal photos, appointment attachments, future avatar uploads). The
 * helper exists so call sites read intent at a glance —
 *
 *   return multipartProxy(req, "/v1/meals/analyze-photo");
 *
 * — instead of repeating `{ multipart: true, method: "POST" }` everywhere.
 *
 * Per docs/standards/api-conventions.md §4:
 *   - Default body cap = 10 MiB (matches Core's upload limit).
 *   - Browser-supplied `Content-Type` (with the multipart boundary) is
 *     preserved end-to-end.
 *   - Oversized bodies short-circuit with HTTP 413 +
 *     `error.code = "PAYLOAD_TOO_LARGE"` before they ever hit Core.
 */

import { NextRequest, NextResponse } from "next/server";

import { coreProxy } from "@/lib/core-api-proxy";

interface MultipartProxyOptions {
  /**
   * Override the upstream HTTP method. Defaults to the incoming request's
   * method (typically POST).
   */
  method?: string;
  /**
   * Cap the body size, in bytes. Defaults to the multipart cap configured in
   * `coreProxy` (10 MiB). Lower values are useful for low-risk routes (e.g.
   * 2 MiB for an avatar upload).
   */
  bodySizeLimit?: number;
  /** Extra headers to merge on top of the forwarded request. */
  extraHeaders?: Record<string, string>;
  /** Defaults to `true`; set to `false` only for unauthenticated public uploads. */
  requireAuth?: boolean;
}

/**
 * Forward a `multipart/form-data` request to the Core BE.
 *
 * @param req       The incoming Next.js request handler.
 * @param corePath  The Core BE path (e.g. `/v1/meals/analyze-photo`).
 * @param options   Optional overrides; see {@link MultipartProxyOptions}.
 */
export function multipartProxy(
  req: NextRequest,
  corePath: string,
  options: MultipartProxyOptions = {}
): Promise<NextResponse> {
  return coreProxy(req, corePath, {
    multipart: true,
    method: options.method ?? req.method,
    bodySizeLimit: options.bodySizeLimit,
    extraHeaders: options.extraHeaders,
    requireAuth: options.requireAuth ?? true,
  });
}
