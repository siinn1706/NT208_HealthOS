/**
 * RN polyfill for CSS color-mix(in srgb, color X%, transparent).
 * Expects hex input (#RRGGBB or #RRGGBBAA).
 */
export function colorMix(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const a = Math.round(alpha * 255);
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

export function withOpacity(hex: string, opacity: number): string {
  return colorMix(hex, opacity);
}
