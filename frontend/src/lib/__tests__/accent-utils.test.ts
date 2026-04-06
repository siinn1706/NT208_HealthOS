import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyTokensToRoot,
  deriveAccentTokens,
  getContrastColor,
  getContrastRatio,
  getRelativeLuminance,
  hexToHsl,
  hslToHex,
  removeAccentOverrides,
} from "@/lib/accent-utils";

describe("hexToHsl / hslToHex", () => {
  it("round-trips #1965B3 within HSL integer rounding", () => {
    const hex = "#1965B3";
    const { h, s, l } = hexToHsl(hex);
    const back = hslToHex(h, s, l).toUpperCase();
    const rgb = (c: string) =>
      [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const [r1, g1, b1] = rgb(hex);
    const [r2, g2, b2] = rgb(back);
    expect(Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2))).toBeLessThanOrEqual(2);
  });

  it("round-trips #000000 and #FFFFFF", () => {
    expect(hslToHex(...Object.values(hexToHsl("#000000")) as [number, number, number]).toUpperCase()).toBe(
      "#000000"
    );
    expect(hslToHex(...Object.values(hexToHsl("#FFFFFF")) as [number, number, number]).toUpperCase()).toBe(
      "#FFFFFF"
    );
  });

  it("round-trips #FF0000", () => {
    const { h, s, l } = hexToHsl("#FF0000");
    expect(hslToHex(h, s, l).toUpperCase()).toBe("#FF0000");
  });
});

describe("deriveAccentTokens", () => {
  it("returns five keys for brand blue light", () => {
    const t = deriveAccentTokens("#1965B3", false);
    expect(Object.keys(t).sort()).toEqual(
      ["--chart-1", "--chart-2", "--primary", "--primary-foreground", "--ring"].sort()
    );
    expect(t["--primary"].toUpperCase()).toMatch(/^#[0-9A-F]{6}$/);
    expect(t["--ring"]).toBe(t["--primary"]);
    expect(t["--chart-1"]).toBe(t["--primary"]);
  });

  it("adjusts brand blue for dark mode", () => {
    const light = deriveAccentTokens("#1965B3", false);
    const dark = deriveAccentTokens("#1965B3", true);
    expect(light["--primary"]).not.toBe(dark["--primary"]);
  });

  it("uses light foreground on very light accent in light mode", () => {
    const t = deriveAccentTokens("#FFFFAA", false);
    expect(getRelativeLuminance(t["--primary-foreground"])).toBeLessThan(
      getRelativeLuminance(t["--primary"])
    );
  });

  it("does not throw on invalid hex and falls back to stock behavior via safe normalization", () => {
    const bad = deriveAccentTokens("##oops", false);
    const good = deriveAccentTokens("#1965B3", false);
    expect(bad).toEqual(good);
  });
});

describe("getContrastColor / getContrastRatio", () => {
  it("returns dark text on light background", () => {
    const fg = getContrastColor("#FFFFFF");
    expect(getContrastRatio(fg, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("returns light text on dark background", () => {
    const fg = getContrastColor("#000000");
    expect(getContrastRatio(fg, "#000000")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("applyTokensToRoot / removeAccentOverrides", () => {
  beforeEach(() => {
    const setProperty = vi.fn();
    const removeProperty = vi.fn();
    const fakeDoc = {
      documentElement: {
        style: { setProperty, removeProperty },
      },
    };
    vi.stubGlobal("document", fakeDoc as unknown as Document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets all five custom properties", () => {
    const style = (globalThis as unknown as { document: Document }).document.documentElement.style as unknown as {
      setProperty: ReturnType<typeof vi.fn>;
    };
    applyTokensToRoot({
      "--primary": "#1965B3",
      "--primary-foreground": "#FFFFFF",
      "--ring": "#1965B3",
      "--chart-1": "#1965B3",
      "--chart-2": "#41BCE6",
    });
    expect(style.setProperty).toHaveBeenCalledTimes(5);
  });

  it("removes all five keys", () => {
    const style = (globalThis as unknown as { document: Document }).document.documentElement.style as unknown as {
      removeProperty: ReturnType<typeof vi.fn>;
    };
    removeAccentOverrides();
    expect(style.removeProperty).toHaveBeenCalledTimes(5);
  });
});
