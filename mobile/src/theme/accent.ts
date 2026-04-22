/**
 * Hex/HSL color conversion and accent token derivation (ported from
 * `frontend/src/lib/accent-utils.ts`). Pure helpers only — no I/O.
 */

const ACCENT_HEX_RE = /^#[0-9A-Fa-f]{6}$/;
/** Stock light-mode primary; safe fallback when stored hex is invalid */
export const FALLBACK_ACCENT_HEX = "#1965B3";

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100;
  const l1 = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) =>
    l1 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

export function getRelativeLuminance(hex: string): number {
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const L1 = getRelativeLuminance(fgHex);
  const L2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const DARK_FG = "#0B0F14";
const LIGHT_FG = "#FFFFFF";
const FG_CANDIDATES = [DARK_FG, "#000000", LIGHT_FG] as const;

export function getContrastColor(bgHex: string): string {
  let best = DARK_FG;
  let bestR = 0;
  for (const c of FG_CANDIDATES) {
    const r = getContrastRatio(c, bgHex);
    if (r >= 4.5) return c;
    if (r > bestR) {
      bestR = r;
      best = c;
    }
  }
  return best;
}

export interface MobileAccentColors {
  brand: string;
  brandMuted: string;
  brandText: string;
  ring: string;
}

/**
 * Derives interactive accent surfaces from a single saved accent hex, matching
 * web `deriveAccentTokens` primary/foreground behavior plus a muted surface tint.
 */
export function deriveMobileAccentColors(accentHex: string, isDark: boolean): MobileAccentColors {
  const hex = ACCENT_HEX_RE.test(accentHex) ? accentHex : FALLBACK_ACCENT_HEX;
  const { h, s, l } = hexToHsl(hex);
  const safeS = Math.min(s, 75);

  const brand = isDark
    ? hslToHex(h, safeS, Math.min(l + 15, 70))
    : hslToHex(h, safeS, Math.max(l, 35));

  const brandText = getContrastColor(brand);

  const brandMuted = isDark
    ? hslToHex(h, Math.max(safeS - 15, 15), Math.min(26, Math.round(l * 0.35 + 8)))
    : hslToHex(h, Math.max(safeS - 25, 8), Math.min(96, 94));

  return {
    brand,
    brandMuted,
    brandText,
    ring: brand,
  };
}
