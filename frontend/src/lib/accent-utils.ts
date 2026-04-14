// Hex/HSL color conversion and accent token derivation utilities

const ACCENT_HEX_RE = /^#[0-9A-Fa-f]{6}$/;
/** Stock light-mode primary; safe fallback when stored hex is invalid */
const FALLBACK_ACCENT_HEX = "#1965B3";

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
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100;
  const l1 = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) => l1 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

export function getRelativeLuminance(hex: string): number {
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio for two sRGB hex colors (normal text target 4.5:1). */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const L1 = getRelativeLuminance(fgHex);
  const L2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const DARK_FG = "#0B0F14";
const LIGHT_FG = "#FFFFFF";
/** Prefer brand off-black, then pure black, then white — first to hit WCAG AA wins. */
const FG_CANDIDATES = [DARK_FG, "#000000", LIGHT_FG] as const;

/** Picks readable text on `bgHex` (≥4.5:1 when possible; else strongest contrast). */
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

export function deriveAccentTokens(accentHex: string, isDark: boolean): Record<string, string> {
  const hex = ACCENT_HEX_RE.test(accentHex) ? accentHex : FALLBACK_ACCENT_HEX;
  const { h, s, l } = hexToHsl(hex);
  const safeS = Math.min(s, 75);

  const primary = isDark
    ? hslToHex(h, safeS, Math.min(l + 15, 70))
    : hslToHex(h, safeS, Math.max(l, 35));

  const primaryFg = getContrastColor(primary);

  // Lighter tint used only for secondary chart color — NOT applied to --accent (hover backgrounds)
  const chartSecondary = isDark
    ? hslToHex(h, Math.max(safeS - 10, 20), Math.min(l + 10, 75))
    : hslToHex(h, Math.max(safeS - 10, 20), Math.min(l + 20, 80));

  // Deliberately omit --sidebar-primary / --sidebar-primary-foreground:
  // those control the sidebar nav active-item icon AND text color, which
  // must stay on their default semantic tokens (not tinted by user accent).
  return {
    "--primary": primary,
    "--primary-foreground": primaryFg,
    "--ring": primary,
    "--chart-1": primary,
    "--chart-2": chartSecondary,
  };
}

export function applyTokensToRoot(tokens: Record<string, string>): void {
  if (typeof document === "undefined") return;
  Object.entries(tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

export function removeAccentOverrides(): void {
  if (typeof document === "undefined") return;
  const keys = [
    "--primary", "--primary-foreground",
    "--ring",
    "--chart-1", "--chart-2",
  ];
  keys.forEach((key) => document.documentElement.style.removeProperty(key));
}
