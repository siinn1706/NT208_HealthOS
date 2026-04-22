import { FALLBACK_ACCENT_HEX } from "./accent";

interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  brand: string;
  brandMuted: string;
  brandText: string;
  /** Focus ring / active chrome (aligned with web `--ring`) */
  ring: string;
  /** Semantic alias: card surface (= `surface`) */
  card: string;
  /** Semantic alias: form field bg (= `inputBackground`) */
  field: string;
  /** Semantic alias: soft accent wash (= `brandMuted`) */
  accentSoft: string;
  success: string;
  successText: string;
  warning: string;
  warningText: string;
  danger: string;
  dangerText: string;
  info: string;
  infoText: string;
  overlay: string;
  shimmer: string;
  inputBackground: string;
}

/** Default accent-driven colors for `deriveMobileAccentColors(FALLBACK, light)` */
const LIGHT_BRAND_DEFAULT = FALLBACK_ACCENT_HEX;
const LIGHT_BRAND_MUTED_DEFAULT = "#E3F2FD";
const LIGHT_BRAND_TEXT_DEFAULT = "#FFFFFF";

export const lightPalette: Palette = {
  background: "#F4FCFE",
  surface: "#FFFFFF",
  surfaceMuted: "#E8F8FD",
  border: "#B8F0FA",
  borderStrong: "#75A2B9",
  text: "#0F2743",
  textMuted: "#5B90C4",
  textInverse: "#FFFFFF",
  brand: LIGHT_BRAND_DEFAULT,
  brandMuted: LIGHT_BRAND_MUTED_DEFAULT,
  brandText: LIGHT_BRAND_TEXT_DEFAULT,
  ring: LIGHT_BRAND_DEFAULT,
  card: "#FFFFFF",
  field: "#FFFFFF",
  accentSoft: LIGHT_BRAND_MUTED_DEFAULT,
  success: "#059669",
  successText: "#FFFFFF",
  warning: "#D97706",
  warningText: "#FFFFFF",
  danger: "#E54D4D",
  dangerText: "#FFFFFF",
  info: "#0284C7",
  infoText: "#FFFFFF",
  overlay: "rgba(15, 39, 67, 0.45)",
  shimmer: "#D4EBF7",
  inputBackground: "#FFFFFF",
};

const DARK_BRAND_DEFAULT = "#5BA8C8";
const DARK_BRAND_MUTED_DEFAULT = "#152028";
const DARK_BRAND_TEXT_DEFAULT = "#0B0F14";

export const darkPalette: Palette = {
  background: "#0B0F14",
  surface: "#141A22",
  surfaceMuted: "#1A2130",
  border: "rgba(138, 162, 180, 0.22)",
  borderStrong: "#3D4F62",
  text: "#EAEEF2",
  textMuted: "#7A8A99",
  textInverse: "#0B0F14",
  brand: DARK_BRAND_DEFAULT,
  brandMuted: DARK_BRAND_MUTED_DEFAULT,
  brandText: DARK_BRAND_TEXT_DEFAULT,
  ring: DARK_BRAND_DEFAULT,
  card: "#141A22",
  field: "rgba(138, 162, 180, 0.12)",
  accentSoft: DARK_BRAND_MUTED_DEFAULT,
  success: "#34D399",
  successText: "#0B0F14",
  warning: "#FBBF24",
  warningText: "#0B0F14",
  danger: "#E54D4D",
  dangerText: "#2A0B0B",
  info: "#38BDF8",
  infoText: "#0B0F14",
  overlay: "rgba(0, 0, 0, 0.6)",
  shimmer: "#1B2838",
  inputBackground: "rgba(138, 162, 180, 0.12)",
};

export type ThemeColors = Palette;
