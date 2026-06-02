/**
 * Locked sanitization schema for AI-generated markdown rendered in chat and
 * meal contexts.  Permissive defaults are stripped down to prevent:
 *   - XSS via <img onerror>, <script>, inline event handlers
 *   - Phishing via data: / javascript: href or src URIs
 *   - Style-based exfil via <style> / inline style attributes
 *
 * Q5 (CDN allowlist enforcement) is tracked separately; this schema operates
 * at the HTML element/attribute level only.
 */
import type { Options } from "rehype-sanitize";

// Only the tag names an AI health assistant legitimately needs.
// img, script, style, iframe, form, input are intentionally absent.
const ALLOWED_TAG_NAMES = [
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "br",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "del",
  "sup",
  "sub",
  "hr",
];

/**
 * `aiMarkdownSchema` is passed directly to `rehypeSanitize`.
 * – Links are restricted to https:// and http:// (no data:, javascript:)
 * – `code` blocks keep `className` for syntax-highlight integration
 * – All other per-element attributes are stripped via the empty `*` rule
 * – img / script / style / iframe tags are stripped _with_ their children
 */
export const aiMarkdownSchema: Options = {
  tagNames: ALLOWED_TAG_NAMES,

  attributes: {
    // Allow href only when it starts with https:// or http://.
    // hast-util-sanitize PropertyDefinition tuple form: [propName, ...allowedValues|RegExp]
    a: [["href", /^https?:\/\//]],
    // className is needed for syntax-highlight libraries (e.g. rehype-highlight)
    code: ["className"],
    // Strip every attribute from all other allowed tags
    "*": [],
  },

  // Protocols for href — belt-and-suspenders alongside the attribute regex.
  protocols: {
    href: ["https", "http"],
  },

  // Drop these tags and their entire subtrees (children are NOT preserved).
  strip: ["img", "script", "style", "iframe", "form", "input", "textarea"],

  // Prefix ids/names to prevent DOM clobbering (e.g., clobbering document.body)
  clobberPrefix: "ai-content-",
};
