/**
 * admin-redesign.spec.ts — smoke tests for admin console redesign
 *
 * These tests require a running dev server with a seeded admin session.
 * They verify the structural landmarks introduced by the redesign are present
 * and accessible, without asserting pixel-level layout details.
 *
 * Skipped in CI unless ADMIN_E2E=1 env var is set (admin session seeding
 * is not part of the default CI fixture).
 */

import { test, expect } from "@playwright/test";

const ADMIN_E2E = process.env.ADMIN_E2E === "1";

test.describe("Admin console redesign — structural smoke tests", () => {
  test.skip(!ADMIN_E2E, "Set ADMIN_E2E=1 to run admin e2e tests");

  test("admin login page loads with correct heading", async ({ page }) => {
    await page.goto("/en/admin/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  test.describe("Authenticated admin shell", () => {
    test.beforeEach(async ({ page }) => {
      // Expects a seeded admin session cookie or a login fixture.
      // In CI, run with ADMIN_E2E=1 and a pre-seeded admin user.
      await page.goto("/en/admin");
    });

    test("admin sidebar is present with aria-label='Admin navigation'", async ({ page }) => {
      await expect(page.getByRole("complementary", { name: "Admin navigation" })).toBeVisible({ timeout: 20_000 });
    });

    test("admin top bar header is present", async ({ page }) => {
      await expect(page.getByRole("banner")).toBeVisible({ timeout: 20_000 });
    });

    test("skip-to-content link is in the DOM", async ({ page }) => {
      const skipLink = page.getByRole("link", { name: /skip.*content/i });
      await expect(skipLink).toBeAttached();
    });

    test("overview page h1 is 'Overview'", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible({ timeout: 20_000 });
    });

    test("overview KPI cards grid is present", async ({ page }) => {
      const grid = page.getByRole("region", { name: "Overview metrics" });
      // Falls back to aria-label on the div
      const kpiGrid = page.locator('[aria-label="Overview metrics"]');
      await expect(kpiGrid).toBeVisible({ timeout: 20_000 });
    });

    test("users page loads with h1='Users'", async ({ page }) => {
      await page.goto("/en/admin/users");
      await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible({ timeout: 20_000 });
    });

    test("subscriptions page loads with h1 containing 'Plan'", async ({ page }) => {
      await page.goto("/en/admin/subscriptions");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/plan/i, { timeout: 20_000 });
    });

    test("active sidebar link has aria-current='page'", async ({ page }) => {
      await page.goto("/en/admin/users");
      const usersLink = page.getByRole("link", { name: /users/i }).first();
      await expect(usersLink).toHaveAttribute("aria-current", "page");
    });

    test("sidebar collapse button is accessible", async ({ page }) => {
      const collapseBtn = page.getByRole("button", { name: /collapse sidebar/i });
      await expect(collapseBtn).toBeVisible({ timeout: 20_000 });
    });

    test("CSS custom property --admin-sidebar-bg is applied (dark sidebar token)", async ({ page }) => {
      const sidebar = page.getByRole("complementary", { name: "Admin navigation" });
      const className = await sidebar.getAttribute("class");
      expect(className).toContain("--admin-sidebar-bg");
    });
  });
});
