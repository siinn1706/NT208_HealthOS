import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildLocaleMetadata, buildNoindexMetadata } from "../locale-metadata";
import { _resetSiteUrlCache } from "../site-url";

beforeEach(() => {
  _resetSiteUrlCache();
  delete process.env.NEXT_PUBLIC_APP_URL;
});
afterEach(() => {
  _resetSiteUrlCache();
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("buildLocaleMetadata", () => {
  it("sets canonical to the locale-prefixed URL", () => {
    const meta = buildLocaleMetadata({
      locale: "vi",
      path: "/about",
      title: "About — HealthOS",
      description: "About page",
    });
    expect(meta.alternates?.canonical).toBe("https://healthos.page/vi/about");
  });

  it("includes vi, en, and x-default hreflang entries", () => {
    const meta = buildLocaleMetadata({
      locale: "en",
      path: "/plans",
      title: "Plans",
      description: "Plans page",
    });
    const langs = meta.alternates?.languages as Record<string, string>;
    expect(langs.vi).toBe("https://healthos.page/vi/plans");
    expect(langs.en).toBe("https://healthos.page/en/plans");
    expect(langs["x-default"]).toBe("https://healthos.page/vi/plans");
  });

  it("sets openGraph.url to the canonical self URL", () => {
    const meta = buildLocaleMetadata({
      locale: "en",
      path: "/services",
      title: "Services",
      description: "Services page",
    });
    expect(meta.openGraph?.url).toBe("https://healthos.page/en/services");
  });

  it("includes OG image when provided", () => {
    const meta = buildLocaleMetadata({
      locale: "vi",
      path: "/articles/1",
      title: "Article",
      description: "Article desc",
      image: "https://images.example.com/photo.jpg",
    });
    expect(meta.openGraph?.images).toBeDefined();
  });

  it("does not set robots noindex", () => {
    const meta = buildLocaleMetadata({
      locale: "vi",
      path: "/",
      title: "Home",
      description: "Home page",
    });
    expect(meta.robots).toBeUndefined();
  });
});

describe("buildNoindexMetadata", () => {
  it("sets robots index:false follow:true", () => {
    const meta = buildNoindexMetadata({
      locale: "vi",
      path: "/login",
      title: "Login — HealthOS",
      description: "Sign in",
    });
    const robots = meta.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(true);
  });

  it("does not include alternates (no canonical or hreflang)", () => {
    const meta = buildNoindexMetadata({
      locale: "en",
      path: "/register",
      title: "Register",
      description: "Create account",
    });
    expect(meta.alternates).toBeUndefined();
  });

  it("does not include openGraph.url", () => {
    const meta = buildNoindexMetadata({
      locale: "vi",
      path: "/verify",
      title: "Verify",
      description: "Verify OTP",
    });
    expect(meta.openGraph?.url).toBeUndefined();
  });

  it("still carries title and description", () => {
    const meta = buildNoindexMetadata({
      locale: "vi",
      path: "/login",
      title: "Login — HealthOS",
      description: "Sign in to your account",
    });
    expect(meta.title).toBe("Login — HealthOS");
    expect(meta.description).toBe("Sign in to your account");
  });
});
