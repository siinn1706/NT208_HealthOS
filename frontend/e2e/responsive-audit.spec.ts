/**
 * Responsive audit: captures screenshots and checks for hard overflow
 * at 320px, 375px, 768px viewports across all major dashboard pages.
 * Requires DEV_BYPASS_ENABLED=true in .env.local
 */
import { test, expect, BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT_DIR = path.join(__dirname, "../audit-screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "320", width: 320, height: 700 },
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
];

const DASHBOARD_PAGES = [
  { name: "dashboard",      path: "/vi/dashboard" },
  { name: "health",         path: "/vi/dashboard/health" },
  { name: "meals",          path: "/vi/dashboard/meals" },
  { name: "medications",    path: "/vi/dashboard/medications" },
  { name: "reminders",      path: "/vi/dashboard/reminders" },
  { name: "appointments",   path: "/vi/dashboard/appointments" },
  { name: "profile",        path: "/vi/dashboard/profile" },
  { name: "chat",           path: "/vi/dashboard/chat" },
  { name: "notifications",  path: "/vi/dashboard/notifications" },
  { name: "settings",       path: "/vi/dashboard/settings" },
  { name: "emergency-card", path: "/vi/dashboard/emergency-card" },
  { name: "visit-prep",     path: "/vi/dashboard/visit-prep" },
  { name: "leaderboard",    path: "/vi/dashboard/leaderboard" },
  { name: "achievements",   path: "/vi/dashboard/achievements" },
];

const AUTH_PAGES = [
  { name: "login",           path: "/vi/login" },
  { name: "register",        path: "/vi/register" },
  { name: "forgot-password", path: "/vi/forgot-password" },
];

const MAIN_PAGES = [
  { name: "home",     path: "/vi" },
  { name: "about",    path: "/vi/about" },
  { name: "articles", path: "/vi/articles" },
  { name: "plans",    path: "/vi/plans" },
  { name: "services", path: "/vi/services" },
];

const OVERFLOW_CHECK = `
  (() => {
    function findScrollAncestor(el) {
      let node = el.parentElement;
      while (node) {
        const s = getComputedStyle(node);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') return node;
        node = node.parentElement;
      }
      return null;
    }
    const hard = [];
    for (const el of document.querySelectorAll('a, button, input, select, textarea')) {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 2 && r.width > 0) {
        const sc = findScrollAncestor(el);
        const scRect = sc?.getBoundingClientRect();
        const inScroll = sc && scRect && scRect.right <= window.innerWidth + 2;
        if (!inScroll) hard.push({
          tag: el.tagName,
          text: (el.textContent?.trim() || el.getAttribute('type') || '').slice(0, 30),
          right: Math.round(r.right),
          vw: window.innerWidth
        });
      }
    }
    return hard;
  })()
`;

async function createAuthedContext(browser: import("@playwright/test").Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "healthos.session",
      value: "DEV_BYPASS:audit@healthos.local",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "healthos.meta",
      value: JSON.stringify({ onboarding_status: "completed" }),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  return context;
}

// Auth pages — no login needed
for (const vp of VIEWPORTS) {
  for (const pg of AUTH_PAGES) {
    test(`AUTH ${pg.name} @ ${vp.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, `${pg.name}-${vp.name}.png`) });
      const overflows = await page.evaluate(OVERFLOW_CHECK);
      if (overflows.length > 0) {
        console.log(`OVERFLOW on ${pg.name} @ ${vp.name}px:`, JSON.stringify(overflows, null, 2));
      }
      expect(overflows, `Hard overflow on ${pg.name} @ ${vp.name}px`).toHaveLength(0);
    });
  }
}

// Marketing/main pages — no login needed
for (const vp of VIEWPORTS) {
  for (const pg of MAIN_PAGES) {
    test(`MAIN ${pg.name} @ ${vp.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, `main-${pg.name}-${vp.name}.png`) });
      const overflows = await page.evaluate(OVERFLOW_CHECK);
      if (overflows.length > 0) {
        console.log(`OVERFLOW on MAIN ${pg.name} @ ${vp.name}px:`, JSON.stringify(overflows, null, 2));
      }
      expect(overflows, `Hard overflow on MAIN ${pg.name} @ ${vp.name}px`).toHaveLength(0);
    });
  }
}

// Dashboard pages — need auth cookies
for (const vp of VIEWPORTS) {
  for (const pg of DASHBOARD_PAGES) {
    test(`DASH ${pg.name} @ ${vp.name}px`, async ({ browser }) => {
      const context = await createAuthedContext(browser);
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT_DIR, `${pg.name}-${vp.name}.png`) });
      const overflows = await page.evaluate(OVERFLOW_CHECK);
      if (overflows.length > 0) {
        console.log(`OVERFLOW on ${pg.name} @ ${vp.name}px:`, JSON.stringify(overflows, null, 2));
      }
      expect(overflows, `Hard overflow on ${pg.name} @ ${vp.name}px`).toHaveLength(0);
      await context.close();
    });
  }
}
