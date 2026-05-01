/**
 * Runtime CSS-variable → canvas-safe color helpers.
 *
 * ECharts / zrender passes color strings directly to the Canvas 2D API
 * (CanvasGradient.addColorStop, fillStyle, strokeStyle …).  The Canvas API
 * does NOT understand CSS custom properties (`var(--x)`) or modern CSS
 * functions (`color-mix(…)`).  Any color that ends up inside an ECharts
 * `colorStops` array or `itemStyle.color` field must be a plain
 * hex / rgb / rgba string.
 *
 * Usage:
 *   import { cssRgba, getCssVar } from "@/lib/chart-colors";
 *
 *   // inside a component (client-side only):
 *   const primaryAlpha = cssRgba("--primary", 0.25);
 */

/** Read a CSS custom property from :root as a trimmed string. */
export function getCssVar(name: string, fallback = "#000000"): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * Convert a CSS custom property that holds a hex colour (#rrggbb / #rgb)
 * into `rgba(r, g, b, alpha)` — safe for Canvas / ECharts gradient stops.
 *
 * @param varName  CSS variable name, e.g. "--primary"
 * @param alpha    Opacity in [0, 1]
 * @param fallback Hex colour used during SSR or when the variable is unset
 */
export function cssRgba(
  varName: string,
  alpha: number,
  fallback = "#000000",
): string {
  const hex = getCssVar(varName, fallback);

  // Normalise shorthand #rgb → #rrggbb
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  if (/^#[0-9a-fA-F]{6}$/.test(full)) {
    const r = parseInt(full.slice(1, 3), 16);
    const g = parseInt(full.slice(3, 5), 16);
    const b = parseInt(full.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Fallback: return hex directly (Canvas can parse plain hex)
  return hex;
}
