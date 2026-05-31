import { expect, test, type Page } from "@playwright/test";

const email = process.env.HEALTHOS_E2E_EMAIL ?? process.env.E2E_EMAIL;
const password = process.env.HEALTHOS_E2E_PASSWORD ?? process.env.E2E_PASSWORD;
const tzid = process.env.HEALTHOS_E2E_TZID ?? "Asia/Ho_Chi_Minh";

function localDateInTz(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tzid,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localNoonIso(date = localDateInTz()): string {
  return new Date(`${date}T12:00:00+07:00`).toISOString();
}

function futureAppointmentIso(): string {
  const future = new Date();
  future.setDate(future.getDate() + 14);
  return new Date(`${localDateInTz(future)}T10:30:00+07:00`).toISOString();
}

async function login(page: Page) {
  if (!email || !password) throw new Error("Missing E2E credentials");
  await page.goto("/en/login");
  await page.getByLabel(/email|username/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 20_000 });
  await page.goto("/en/dashboard");
}

test.describe("authenticated persistence regressions", () => {
  test.skip(!email || !password, "Set HEALTHOS_E2E_EMAIL and HEALTHOS_E2E_PASSWORD to run.");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("authenticated dashboard route crawl has no crashes", async ({ page }) => {
    const routes = [
      "/en/dashboard",
      "/en/dashboard/meals",
      "/en/dashboard/appointments",
      "/en/dashboard/medications",
      "/en/dashboard/reminders",
      "/en/dashboard/reports",
      "/en/dashboard/settings",
    ];
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.status(), route).toBeLessThan(500);
      await expect(page.locator("body"), route).toBeVisible();
    }
    expect(consoleErrors.filter((msg) => /500|hydration|uncaught/i.test(msg))).toEqual([]);
  });

  test("meal create is visible after diary reload", async ({ page }) => {
    const marker = `E2E meal ${Date.now()}`;
    const res = await page.request.post("/api/v1/meals", {
      headers: { "Idempotency-Key": `meal-${crypto.randomUUID()}` },
      data: {
        name: marker,
        logged_at: localNoonIso(),
        meal_type: "lunch",
        ingredients: [],
      },
    });
    expect(res.status()).toBe(201);

    await page.goto("/en/dashboard/meals");
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("appointment create is visible immediately and after reload", async ({ page }) => {
    const marker = `Dr E2E ${Date.now()}`;
    const res = await page.request.post("/api/v1/appointments", {
      data: {
        appointment_date: futureAppointmentIso(),
        doctor_name: marker,
        specialty: "Persistence",
        clinic: "E2E Clinic",
        reason: "Persistence regression",
      },
    });
    expect(res.status()).toBe(201);

    await page.goto("/en/dashboard/appointments");
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("medication create returns success and is visible after reload", async ({ page }) => {
    const marker = `E2E medication ${Date.now()}`;
    const res = await page.request.post("/api/v1/medications", {
      data: {
        name: marker,
        dose_times: ["08:00"],
        repeat: "daily",
        start_date: localDateInTz(),
        tzid,
      },
    });
    expect(res.status()).toBe(201);

    await page.goto("/en/dashboard/medications");
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("daily reminder remains in Today after reload", async ({ page }) => {
    const marker = `E2E reminder ${Date.now()}`;
    const res = await page.request.post("/api/v1/reminders", {
      data: {
        type: "medicine",
        title: marker,
        time: "08:00",
        repeat: "daily",
        note: "Persistence regression",
        tzid,
      },
    });
    expect(res.status()).toBe(201);

    await page.goto("/en/dashboard/reminders");
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });
});
