import { describe, it, expect } from "vitest";
import { deriveAccentTokens, getContrastRatio } from "@/lib/accent-utils";

/** Diverse accents: pastels, neons, earth, gray, near-white/black */
const ACCENT_SAMPLES = [
  "#1965B3",
  "#5BA8C8",
  "#E91E63",
  "#00BCD4",
  "#FF5722",
  "#4CAF50",
  "#9C27B0",
  "#FFF000",
  "#1A1A2E",
  "#808080",
  "#F5E6D3",
  "#2E4A3E",
  "#FFB6C1",
  "#0A3D62",
  "#F4E04D",
  "#3C1874",
  "#B5651D",
  "#98FF98",
  "#36454F",
  "#FF1493",
  "#DFFF00",
  "#301934",
];

describe("WCAG AA contrast for derived primary/foreground", () => {
  it.each(["light", "dark"] as const)("mode %s — all samples ≥ 4.5:1", (mode) => {
    const isDark = mode === "dark";
    for (const hex of ACCENT_SAMPLES) {
      const t = deriveAccentTokens(hex, isDark);
      const ratio = getContrastRatio(t["--primary-foreground"], t["--primary"]);
      expect(ratio, `${hex} ${mode}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
