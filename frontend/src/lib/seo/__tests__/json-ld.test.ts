import { describe, it, expect } from "vitest";
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "../json-ld";

describe("jsonLdScript", () => {
  it("produces valid JSON", () => {
    const out = jsonLdScript({ foo: "bar" });
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out)).toEqual({ foo: "bar" });
  });

  it("escapes < to prevent </script> injection", () => {
    const out = jsonLdScript({ xss: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("escapes U+2028 LINE SEPARATOR", () => {
    const payload = { text: "line sep" };
    const out = jsonLdScript(payload);
    expect(out).not.toContain(" ");
    expect(out).toContain("\\u2028");
  });

  it("escapes U+2029 PARAGRAPH SEPARATOR", () => {
    const payload = { text: "para sep" };
    const out = jsonLdScript(payload);
    expect(out).not.toContain(" ");
    expect(out).toContain("\\u2029");
  });

  it("handles nested objects and arrays", () => {
    const payload = { arr: [{ a: 1 }, { b: "<tag>" }] };
    const out = jsonLdScript(payload);
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual(payload);
  });
});

describe("organizationJsonLd", () => {
  it('has @type "Organization"', () => {
    expect(organizationJsonLd["@type"]).toBe("Organization");
  });

  it("url and logo point to healthos.io.vn", () => {
    expect(organizationJsonLd.url).toContain("healthos.io.vn");
    expect(organizationJsonLd.logo).toContain("healthos.io.vn");
  });

  it("logo references /logo.svg", () => {
    expect(organizationJsonLd.logo).toContain("/logo.svg");
  });
});

describe("websiteJsonLd", () => {
  it('has @type "WebSite"', () => {
    expect(websiteJsonLd["@type"]).toBe("WebSite");
  });

  it("url points to healthos.io.vn", () => {
    expect(websiteJsonLd.url).toContain("healthos.io.vn");
  });
});
