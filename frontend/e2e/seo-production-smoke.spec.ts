/**
 * Production SEO smoke test — runs against PROD_BASE (https://healthos.io.vn).
 *
 * Gates on the env var so it is never accidentally run against localhost.
 * Run: PLAYWRIGHT_BASE_URL=https://healthos.io.vn npx playwright test seo-production-smoke
 */
import { test, expect } from "@playwright/test";

const PROD_BASE = "https://healthos.io.vn";
const PROD_HOST = "healthos.io.vn";

// Match legacy public hosts only — anchored to avoid matching the substring
// "healthos.vn" inside the current host "healthos.io.vn".
const LEGACY_HOST_REGEX = /(?:^|[^a-z0-9.-])(?:healthos\.vn|healthos\.page)(?:[^a-z0-9.-]|$)/i;

test.beforeEach(async ({}, testInfo) => {
  if (process.env.PLAYWRIGHT_BASE_URL !== PROD_BASE) {
    testInfo.skip(true, `Skipped: PLAYWRIGHT_BASE_URL is not ${PROD_BASE}`);
  }
});

test("canonical on /en/about points to production host", async ({ page }) => {
  await page.goto("/en/about");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).not.toBeNull();
  const canonicalUrl = new URL(canonical!);
  expect(canonicalUrl.host).toBe(PROD_HOST);
  expect(canonicalUrl.pathname).toBe("/en/about");
});

test("/robots.txt references production host and not legacy hosts", async ({ page }) => {
  const res = await page.goto("/robots.txt");
  expect(res?.status()).toBe(200);
  const body = await res?.text();
  expect(body).toContain(PROD_HOST);
  expect(body).not.toMatch(LEGACY_HOST_REGEX);
});

test("/sitemap.xml URLs use production host", async ({ page }) => {
  const res = await page.goto("/sitemap.xml");
  const body = await res?.text();
  const locs = body?.match(/<loc>(.*?)<\/loc>/g) ?? [];
  expect(locs.length).toBeGreaterThan(0);
  for (const loc of locs) {
    const url = loc.replace(/<\/?loc>/g, "");
    expect(new URL(url).host).toBe(PROD_HOST);
    expect(loc).not.toMatch(LEGACY_HOST_REGEX);
  }
});

test("www redirect: www.healthos.io.vn/en → healthos.io.vn/en", async ({ request }) => {
  const res = await request.get(`https://www.${PROD_HOST}/en`, {
    maxRedirects: 0,
  });
  expect([301, 308]).toContain(res.status());
  const location = res.headers()["location"] ?? "";
  expect(new URL(location).host).toBe(PROD_HOST);
});

test("article detail on production has correct canonical", async ({ page }) => {
  await page.goto("/en/articles/1");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).not.toBeNull();
  const canonicalUrl = new URL(canonical!);
  expect(canonicalUrl.host).toBe(PROD_HOST);
  expect(canonicalUrl.pathname).toBe("/en/articles/1");
});

test("auth page /en/login has noindex on production", async ({ page }) => {
  await page.goto("/en/login");
  const content = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(content).toMatch(/noindex/);
});
