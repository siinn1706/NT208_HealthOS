import { test, expect } from "@playwright/test";

test("marketing home loads (locale route)", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("navigation")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/health/i).first()).toBeVisible();
});
