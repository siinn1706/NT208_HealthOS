/**
 * Production SEO smoke test — only runs when PLAYWRIGHT_BASE_URL=https://healthos.page.
 *
 * Gates on the env var so it is never accidentally run against localhost.
 * Run: PLAYWRIGHT_BASE_URL=https://healthos.page npx playwright test seo-production-smoke
 */
import { test, expect } from "@playwright/test";

const PROD_BASE = "https://healthos.page";

test.beforeEach(async ({}, testInfo) => {
  if (process.env.PLAYWRIGHT_BASE_URL !== PROD_BASE) {
    testInfo.skip(true, "Skipped: PLAYWRIGHT_BASE_URL is not https://healthos.page");
  }
});

test("canonical on /en/about points to healthos.page", async ({ page }) => {
  await page.goto("/en/about");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/^https:\/\/healthos\.page\/en\/about$/);
});

test("/robots.txt host field is healthos.page", async ({ page }) => {
  const res = await page.goto("/robots.txt");
  expect(res?.status()).toBe(200);
  const body = await res?.text();
  expect(body).toContain("healthos.page");
});

test("/sitemap.xml URLs start with https://healthos.page", async ({ page }) => {
  const res = await page.goto("/sitemap.xml");
  const body = await res?.text();
  // All <loc> entries must use the canonical host — none pointing at old host
  const locs = body?.match(/<loc>(.*?)<\/loc>/g) ?? [];
  expect(locs.length).toBeGreaterThan(0);
  for (const loc of locs) {
    expect(loc).toContain("healthos.page");
    expect(loc).not.toContain("healthos.vn");
  }
});

test("www redirect: www.healthos.page/en → healthos.page/en", async ({ request }) => {
  const res = await request.get("https://www.healthos.page/en", {
    maxRedirects: 0,
  });
  expect([301, 308]).toContain(res.status());
  const location = res.headers()["location"] ?? "";
  expect(location).toMatch(/^https:\/\/healthos\.page/);
});

test("article detail on production has correct canonical", async ({ page }) => {
  await page.goto("/en/articles/1");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/^https:\/\/healthos\.page\/en\/articles\/1$/);
});

test("auth page /en/login has noindex on production", async ({ page }) => {
  await page.goto("/en/login");
  const content = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(content).toMatch(/noindex/);
});
