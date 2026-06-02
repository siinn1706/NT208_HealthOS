/**
 * Tests for frontend/src/lib/markdown-sanitize.ts — aiMarkdownSchema
 *
 * Uses hast-util-sanitize directly (available as a transitive dep) to verify
 * the schema blocks the XSS vectors relevant to AI-generated chat content.
 * rehype-stringify is not available as a transitive dep, so we inspect the
 * sanitized hast tree rather than serialised HTML — this tests the schema
 * configuration itself, which is what rehypeSanitize consumes.
 */

import { sanitize } from "hast-util-sanitize";
import { aiMarkdownSchema } from "../../lib/markdown-sanitize";
import type { Element, Root, Text } from "hast";

// ---------------------------------------------------------------------------
// Helpers to build minimal hast nodes
// ---------------------------------------------------------------------------

function el(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: (Element | Text)[] = []
): Element {
  return { type: "element", tagName, properties, children };
}

function text(value: string): Text {
  return { type: "text", value };
}

function root(...children: (Element | Text)[]): Root {
  return { type: "root", children };
}

/** Collect all element tag names in a hast tree (depth-first). */
function collectTagNames(node: Root | Element): string[] {
  const tags: string[] = [];
  function walk(n: Root | Element) {
    if (n.type === "element") tags.push((n as Element).tagName);
    for (const child of n.children ?? []) {
      if (child.type === "element" || child.type === "root") walk(child as Element);
    }
  }
  walk(node);
  return tags;
}

/** Find the first element with given tagName. */
function findEl(node: Root | Element, tag: string): Element | undefined {
  if (node.type === "element" && (node as Element).tagName === tag) return node as Element;
  for (const child of node.children ?? []) {
    if (child.type === "element" || child.type === "root") {
      const found = findEl(child as Element, tag);
      if (found) return found;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Tag allowlist
// ---------------------------------------------------------------------------

describe("aiMarkdownSchema — tag allowlist", () => {
  it("strips <img> tag entirely (node removed from tree)", () => {
    const tree = root(el("img", { src: "x", onError: "alert(1)" }));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(collectTagNames(safe)).not.toContain("img");
  });

  it("strips <script> and its children", () => {
    const tree = root(el("script", {}, [text("alert('xss')")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(collectTagNames(safe)).not.toContain("script");
    // Content must not bleed into the tree as a text node at root level
    const textNodes = safe.children.filter((c) => c.type === "text");
    expect(textNodes.map((n) => (n as Text).value).join("")).not.toContain("alert");
  });

  it("strips <style> tags", () => {
    const tree = root(el("style", {}, [text("body{display:none}")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(collectTagNames(safe)).not.toContain("style");
  });

  it("strips <iframe> tags", () => {
    const tree = root(el("iframe", { src: "https://evil.com" }));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(collectTagNames(safe)).not.toContain("iframe");
  });

  it("preserves <p> tags", () => {
    const tree = root(el("p", {}, [text("hello")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(collectTagNames(safe)).toContain("p");
  });

  it("preserves <strong>, <em>, <code>, <a>, list elements", () => {
    const tree = root(
      el("strong", {}, [text("bold")]),
      el("em", {}, [text("italic")]),
      el("code", {}, [text("x = 1")]),
      el("ul", {}, [el("li", {}, [text("item")])]),
      el("a", { href: "https://example.com" }, [text("link")])
    );
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const tags = collectTagNames(safe);
    expect(tags).toContain("strong");
    expect(tags).toContain("em");
    expect(tags).toContain("code");
    expect(tags).toContain("ul");
    expect(tags).toContain("li");
    expect(tags).toContain("a");
  });
});

// ---------------------------------------------------------------------------
// Attribute / protocol filtering
// ---------------------------------------------------------------------------

describe("aiMarkdownSchema — attribute filtering", () => {
  it("removes javascript: href from <a>", () => {
    const tree = root(el("a", { href: "javascript:alert(1)" }, [text("click")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const anchor = findEl(safe, "a");
    // Either the <a> is removed entirely, or its href is stripped
    if (anchor) {
      expect(anchor.properties?.href).toBeUndefined();
    }
    // Either way, no javascript: URL survives
    expect(JSON.stringify(safe)).not.toContain("javascript:");
  });

  it("removes data: href from <a>", () => {
    const tree = root(
      el("a", { href: "data:text/html,<script>alert(1)</script>" }, [text("click")])
    );
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    expect(JSON.stringify(safe)).not.toContain("data:");
  });

  it("preserves https:// href on <a>", () => {
    const tree = root(el("a", { href: "https://example.com" }, [text("link")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const anchor = findEl(safe, "a");
    expect(anchor?.properties?.href).toBe("https://example.com");
  });

  it("preserves http:// href on <a>", () => {
    const tree = root(el("a", { href: "http://example.com" }, [text("link")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const anchor = findEl(safe, "a");
    expect(anchor?.properties?.href).toBe("http://example.com");
  });

  it("strips onerror / onclick event-handler attributes from any element", () => {
    const tree = root(
      el("p", { onClick: "evil()", onError: "bad()" }, [text("text")])
    );
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const p = findEl(safe, "p");
    expect(p?.properties?.onClick).toBeUndefined();
    expect(p?.properties?.onError).toBeUndefined();
  });

  it("strips style attribute from elements", () => {
    const tree = root(el("p", { style: "color:red;background:url(x)" }, [text("text")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const p = findEl(safe, "p");
    expect(p?.properties?.style).toBeUndefined();
  });

  it("preserves className on <code> for syntax-highlight integration", () => {
    const tree = root(el("code", { className: ["language-ts"] }, [text("const x=1")]));
    const safe = sanitize(tree, aiMarkdownSchema) as Root;
    const code = findEl(safe, "code");
    expect(code?.properties?.className).toEqual(["language-ts"]);
  });
});
