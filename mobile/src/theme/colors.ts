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

export const lightPalette: Palette = {
  background: "#F7F9FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F3F5",
  border: "#E2E8EC",
  borderStrong: "#CBD2D9",
  text: "#0F172A",
  textMuted: "#52606D",
  textInverse: "#FFFFFF",
  brand: "#0E7C66",
  brandMuted: "#D8EDE7",
  brandText: "#FFFFFF",
  success: "#15803D",
  successText: "#F0FDF4",
  warning: "#B45309",
  warningText: "#FFFBEB",
  danger: "#B91C1C",
  dangerText: "#FEF2F2",
  info: "#1D4ED8",
  infoText: "#EFF6FF",
  overlay: "rgba(15, 23, 42, 0.45)",
  shimmer: "#E5EBEF",
  inputBackground: "#FFFFFF",
};

export const darkPalette: Palette = {
  background: "#0B1220",
  surface: "#111A2C",
  surfaceMuted: "#162338",
  border: "#1F2D45",
  borderStrong: "#2C3D5A",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textInverse: "#0B1220",
  brand: "#34D7B5",
  brandMuted: "#0B3B33",
  brandText: "#02211B",
  success: "#22C55E",
  successText: "#04251A",
  warning: "#F59E0B",
  warningText: "#2A1B05",
  danger: "#F87171",
  dangerText: "#2A0B0B",
  info: "#60A5FA",
  infoText: "#0E1E3A",
  overlay: "rgba(0, 0, 0, 0.6)",
  shimmer: "#1B2841",
  inputBackground: "#0F1A2E",
};

export type ThemeColors = Palette;
