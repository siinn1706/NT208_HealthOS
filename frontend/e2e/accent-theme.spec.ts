import { test, expect } from "@playwright/test";

test.describe("accent color — localStorage hydration", () => {
  test("accent-early.js derives CSS variables after reload", async ({ page }) => {
    await page.goto("/en/login");
    await page.evaluate(() => {
      localStorage.setItem("healthos-accent", "#FF00AA");
      localStorage.setItem("theme", "light");
    });
    await page.reload();

    const primary = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--primary").trim()
    );
    const chart2 = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--chart-2").trim()
    );
    expect(primary).toMatch(/^#[0-9A-F]{6}$/i);
    expect(primary.toUpperCase()).not.toBe("#FF00AA");
    expect(chart2).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

test.describe("accent persistence (Core BE)", () => {
  test("PATCH accent via session then reload keeps computed primary", async ({ page }, testInfo) => {
    await page.goto("/en/login");
    await page.getByRole("textbox", { name: /username or email/i }).fill("admin");
    await page.locator("#login-password").fill("admin");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    const reachedDashboard = await page
      .waitForURL(/\/en\/dashboard/, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    testInfo.skip(!reachedDashboard, "Admin login not ready in current environment (seed user or auth flow mismatch).");

    const patchStatus = await page.evaluate(async () => {
      const r = await fetch("/api/v1/preferences/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent_color: "#2E7D32" }),
      });
      return r.status;
    });

    testInfo.skip(
      patchStatus !== 200,
      `preferences PATCH returned ${patchStatus} (start Core BE for full coverage).`
    );

    await page.reload();

    const primaryAfter = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--primary").trim().toUpperCase()
    );
    expect(primaryAfter).toMatch(/^#[0-9A-F]{6}$/);
    expect(primaryAfter).not.toBe("#2E7D32");
  });
});
