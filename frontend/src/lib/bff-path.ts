/**
 * BFF path encoding helpers.
 *
 * Prevents path-traversal attacks by ensuring every dynamic path segment
 * interpolated into a Core BE URL is percent-encoded before use.
 *
 * Usage:
 *   import { corePath } from "@/lib/bff-path";
 *   return coreProxy(req, corePath`/v1/conversations/${id}/messages`);
 */

/**
 * Tagged template literal that encodeURIComponent-encodes all interpolated
 * segments.  Non-segment (literal) parts of the path are left verbatim so
 * separating slashes and fixed path segments are never double-encoded.
 *
 * @example
 *   corePath`/v1/conversations/${"abc-123"}/messages`
 *   // → "/v1/conversations/abc-123/messages"  (UUIDs are no-op)
 *
 *   corePath`/v1/conversations/${"../evil"}/messages`
 *   // → "/v1/conversations/..%2Fevil/messages"
 */
export function corePath(template: TemplateStringsArray, ...segments: string[]): string {
  return template.reduce(
    (acc, lit, i) =>
      acc + lit + (i < segments.length ? encodeURIComponent(segments[i] ?? "") : ""),
    ""
  );
}
