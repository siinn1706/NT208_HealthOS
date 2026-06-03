/**
 * SEO regression spec — runs against the local dev server.
 *
 * Checks:
 *  - Public routes expose canonical + hreflang <link> tags
 *  - Article detail routes render an <h1> and structured JSON-LD
 *  - Auth routes carry noindex meta
 *  - /robots.txt, /sitemap.xml, /llms.txt are reachable
 */
import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/en", canonical: "/en" },
  { path: "/vi", canonical: "/vi" },
  { path: "/en/about", canonical: "/en/about" },
  { path: "/en/services", canonical: "/en/services" },
  { path: "/en/plans", canonical: "/en/plans" },
  { path: "/en/articles", canonical: "/en/articles" },
] as const;

const AUTH_ROUTES = ["/en/login", "/en/register", "/en/forgot-password", "/en/verify"] as const;

// ── Public indexable routes ────────────────────────────────────────────────

for (const { path, canonical } of PUBLIC_ROUTES) {
  test(`${path} — has canonical link`, async ({ page }) => {
    await page.goto(path);
    const canonicalEl = page.locator('link[rel="canonical"]');
    await expect(canonicalEl).toHaveCount(1, { timeout: 15_000 });
    const href = await canonicalEl.getAttribute("href");
    expect(href).toContain(canonical);
  });

  test(`${path} — has hreflang vi and en`, async ({ page }) => {
    await page.goto(path);
    const viLink = page.locator('link[rel="alternate"][hreflang="vi"]');
    const enLink = page.locator('link[rel="alternate"][hreflang="en"]');
    await expect(viLink).toHaveCount(1, { timeout: 15_000 });
    await expect(enLink).toHaveCount(1);
  });
}

// ── Article detail routes ──────────────────────────────────────────────────

test("article detail /en/articles/1 — renders h1 with article title", async ({ page }) => {
  await page.goto("/en/articles/1");
  const h1 = page.locator("h1");
  await expect(h1).toBeVisible({ timeout: 15_000 });
  const text = await h1.textContent();
  expect(text?.trim().length).toBeGreaterThan(10);
});

test("article detail /vi/articles/1 — renders h1 with Vietnamese title", async ({ page }) => {
  await page.goto("/vi/articles/1");
  const h1 = page.locator("h1");
  await expect(h1).toBeVisible({ timeout: 15_000 });
});

test("article detail /en/articles/1 — has Article JSON-LD script", async ({ page }) => {
  await page.goto("/en/articles/1");
  const jsonLd = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    return scripts.map((s) => {
      try { return JSON.parse(s.textContent ?? ""); } catch { return null; }
    }).filter(Boolean);
  });
  const articleSchema = jsonLd.find((s: { "@type"?: string }) => s["@type"] === "Article");
  expect(articleSchema).toBeDefined();
});

test("article detail /en/articles/999 — returns 404", async ({ page }) => {
  const res = await page.goto("/en/articles/999");
  expect(res?.status()).toBe(404);
});

// ── Auth routes — noindex ─────────────────────────────────────────────────

for (const path of AUTH_ROUTES) {
  test(`${path} — has noindex meta`, async ({ page }) => {
    await page.goto(path);
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveCount(1, { timeout: 15_000 });
    const content = await robotsMeta.getAttribute("content");
    expect(content).toMatch(/noindex/);
  });

  test(`${path} — h1 is present`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1, { timeout: 15_000 });
  });
}

// ── Metadata files ─────────────────────────────────────────────────────────

test("/robots.txt — is reachable and contains Sitemap directive", async ({ page }) => {
  const res = await page.goto("/robots.txt");
  expect(res?.status()).toBe(200);
  const body = await res?.text();
  expect(body).toContain("Sitemap:");
  expect(body).toContain("User-agent:");
});

test("/sitemap.xml — is reachable and contains article URLs", async ({ page }) => {
  const res = await page.goto("/sitemap.xml");
  expect(res?.status()).toBe(200);
  const body = await res?.text();
  expect(body).toContain("/articles/1");
});

test("/llms.txt — is reachable and contains canonical", async ({ page }) => {
  const res = await page.goto("/llms.txt");
  expect(res?.status()).toBe(200);
  const body = await res?.text();
  expect(body).toContain("healthos.page");
});
