export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  /**
   * `xs` (4 dp) is for "thin micro chrome" — connection-status dots,
   * progress bars, fine-grained badge corners. Anything bigger jumps
   * to `sm` (6 dp) and starts feeling like a chip.
   */
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  /**
   * `2xs` (11 dp) is the floor for legible mobile text per Material's
   * "label-small" spec. Used for unread-count badges, "edited"
   * timestamps, and other micro-labels that previously hard-coded
   * `fontSize: 10` or `fontSize: 11` inline.
   */
  "2xs": { fontSize: 11, lineHeight: 14 },
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 38 },
} as const;

export const fontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const elevation = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type TypographyVariant = keyof typeof typography;
