// NT208 motion spec — matches CSS custom properties from design handoff
// --ease: cubic-bezier(0.2, 0, 0, 1)

export const motion = {
  // Bezier params for Easing.bezier(x1, y1, x2, y2)
  easeBezier: [0.2, 0, 0, 1] as const,

  durations: {
    fast: 200,     // micro-interactions (focus border, toggle)
    base: 300,     // standard transitions (sheet open, card expand)
    ring: 600,     // progress ring entrance
    sheet: 320,    // bottom sheet slide
  },
} as const;

export type Motion = typeof motion;
