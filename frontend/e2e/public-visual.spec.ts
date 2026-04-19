import { test, expect, type Page } from "@playwright/test";

/**
 * Visual snapshot suite for the public marketing layer.
 *
 * Coverage: 5 routes × 3 breakpoints × 2 themes = 30 snapshots.
 *
 * Stability rules:
 *   1. Animations and transitions are disabled at the document level.
 *   2. Theme is forced via localStorage BEFORE the page loads (next-themes reads
 *      `theme` from localStorage on hydration; emulated colorScheme covers the
 *      pre-hydration paint).
 *   3. We wait for `networkidle` plus a 200ms settle to give Next.js/font swap
 *      time to land. Heavy ambient animations are paused via the CSS injection.
 *
 * Run baseline:  npx playwright test public-visual --update-snapshots
 * Run diff:      npx playwright test public-visual
 */

type ThemeName = "light" | "dark";

interface Breakpoint {
  name: string;
  width: number;
  height: number;
}

const ROUTES = [
  { name: "home", path: "/en" },
  { name: "about", path: "/en/about" },
  { name: "services", path: "/en/services" },
  { name: "plans", path: "/en/plans" },
  { name: "articles", path: "/en/articles" },
] as const;

const BREAKPOINTS: Breakpoint[] = [
  { name: "mobile", width: 375, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const THEMES: ThemeName[] = ["light", "dark"];

const STABILITY_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

async function preparePage(page: Page, theme: ThemeName, bp: Breakpoint, path: string) {
  await page.setViewportSize({ width: bp.width, height: bp.height });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });

  // Seed theme + accent BEFORE first paint so next-themes hydrates without flicker.
  await page.addInitScript((value: ThemeName) => {
    try {
      localStorage.setItem("theme", value);
    } catch { /* ignore */ }
  }, theme);

  await page.addStyleTag({ content: STABILITY_CSS }).catch(() => undefined);

  await page.goto(path, { waitUntil: "networkidle" });
  // Re-inject style tag after navigation to cover styles loaded post-goto.
  await page.addStyleTag({ content: STABILITY_CSS });
  await page.waitForTimeout(200);
}

for (const route of ROUTES) {
  test.describe(`visual: ${route.name}`, () => {
    for (const bp of BREAKPOINTS) {
      for (const theme of THEMES) {
        test(`${bp.name} · ${theme}`, async ({ page }) => {
          await preparePage(page, theme, bp, route.path);
          await expect(page).toHaveScreenshot(`${route.name}-${bp.name}-${theme}.png`, {
            fullPage: true,
            animations: "disabled",
            caret: "hide",
            // Allow tiny anti-aliasing and dynamic-text variance.
            maxDiffPixelRatio: 0.02,
          });
        });
      }
    }
  });
}
