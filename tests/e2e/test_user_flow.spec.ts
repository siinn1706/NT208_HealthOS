import { test, expect } from "@playwright/test";

// E2E — Landing page should load
test("landing page loads successfully", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page).toHaveTitle(/HealthOS/i);
});

// TODO: Add user journey tests
// test("user can sign in and view dashboard", async ({ page }) => { ... });
// test("user can log a meal and see processing status", async ({ page }) => { ... });
