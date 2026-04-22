import {
  deriveMobileAccentColors,
  FALLBACK_ACCENT_HEX,
  getContrastColor,
  hexToHsl,
} from "@/theme/accent";

describe("accent derivation (web parity)", () => {
  it("uses fallback when hex is invalid", () => {
    const d = deriveMobileAccentColors("not-a-color", false);
    expect(d.brand).toBeTruthy();
    expect(d.brandText).toBeTruthy();
    expect(d.ring).toBe(d.brand);
  });

  it("derives Night Sky default in light mode", () => {
    const d = deriveMobileAccentColors(FALLBACK_ACCENT_HEX, false);
    expect(d.brand.toUpperCase().startsWith("#196")).toBe(true);
    expect(getContrastColor(d.brand)).toBe(d.brandText);
  });

  it("moves brand, brandMuted, brandText together from one accent", () => {
    const a = deriveMobileAccentColors("#9333EA", false);
    const b = deriveMobileAccentColors("#9333EA", true);
    expect(a.brand).not.toBe(b.brand);
    expect(a.brandMuted).not.toBe(b.brandMuted);
    expect(hexToHsl(a.brand).h).toBeGreaterThan(250);
  });
});
