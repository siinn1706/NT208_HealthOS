"use client";

import { useEffect } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const raw = m[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function bestForegroundFor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#FFFFFF";
  const L = relativeLuminance(rgb);
  // Heuristic threshold that works well with our palette.
  return L > 0.5 ? "#0F2743" : "#FFFFFF";
}

export function applyAccentColorToRoot(accentColor: string | null) {
  const root = document.documentElement;
  const clear = () => {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-primary-foreground");
  };

  const color = accentColor?.trim() ?? null;
  if (!color) return clear();

  const rgb = hexToRgb(color);
  if (!rgb) return clear();

  const fg = bestForegroundFor(color);
  const c = color.toLowerCase();
  root.style.setProperty("--primary", c);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--ring", c);
  root.style.setProperty("--sidebar-primary", c);
  root.style.setProperty("--sidebar-primary-foreground", fg);
}

type Props = {
  accentColor: string | null;
};

export function UserAccentColorApplier({ accentColor }: Props) {
  useEffect(() => {
    applyAccentColorToRoot(accentColor);
  }, [accentColor]);

  return null;
}

