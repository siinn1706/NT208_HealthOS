import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSiteUrl, _resetSiteUrlCache, absoluteUrl, localeAlternates } from "../site-url";

describe("getSiteUrl", () => {
  beforeEach(() => _resetSiteUrlCache());
  afterEach(() => {
    _resetSiteUrlCache();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("returns the default canonical when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getSiteUrl()).toBe("https://healthos.io.vn");
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("strips trailing slash from env value", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("memoises result after first call", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://first.com";
    const first = getSiteUrl();
    process.env.NEXT_PUBLIC_APP_URL = "https://second.com";
    expect(getSiteUrl()).toBe(first);
  });

  it("_resetSiteUrlCache allows re-reading env", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://first.com";
    getSiteUrl();
    _resetSiteUrlCache();
    process.env.NEXT_PUBLIC_APP_URL = "https://second.com";
    expect(getSiteUrl()).toBe("https://second.com");
  });
});

describe("absoluteUrl", () => {
  beforeEach(() => {
    _resetSiteUrlCache();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });
  afterEach(() => {
    _resetSiteUrlCache();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('returns origin only for "/"', () => {
    expect(absoluteUrl("/")).toBe("https://healthos.io.vn");
  });

  it("appends path to origin", () => {
    expect(absoluteUrl("/vi/about")).toBe("https://healthos.io.vn/vi/about");
  });

  it("prepends slash if missing", () => {
    expect(absoluteUrl("en/plans")).toBe("https://healthos.io.vn/en/plans");
  });

  it("uses default argument", () => {
    expect(absoluteUrl()).toBe("https://healthos.io.vn");
  });
});

describe("localeAlternates", () => {
  beforeEach(() => {
    _resetSiteUrlCache();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });
  afterEach(() => {
    _resetSiteUrlCache();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("returns correct vi and en URLs", () => {
    const alts = localeAlternates("/about");
    expect(alts.languages.vi).toBe("https://healthos.io.vn/vi/about");
    expect(alts.languages.en).toBe("https://healthos.io.vn/en/about");
  });

  it("sets x-default to the vi (defaultLocale) variant", () => {
    const alts = localeAlternates("/plans");
    expect(alts.languages["x-default"]).toBe("https://healthos.io.vn/vi/plans");
  });

  it("canonical equals the vi variant", () => {
    const alts = localeAlternates("/services");
    expect(alts.canonical).toBe("https://healthos.io.vn/vi/services");
  });
});
