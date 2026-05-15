// NT208 motion spec — matches CSS custom properties from design handoff
// --ease: cubic-bezier(0.2, 0, 0, 1)
// --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
// --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1)

export const motion = {
  // Bezier params for Easing.bezier(x1, y1, x2, y2) — matches nt208 CSS vars
  easeBezier:       [0.2,  0,   0,   1  ] as const,  // --ease
  easeOutBezier:    [0.16, 1,   0.3, 1  ] as const,  // --ease-out
  easeSpringBezier: [0.34, 1.4, 0.64, 1 ] as const,  // --ease-spring (overshoot)

  durations: {
    fast:  120,  // --dur-fast 120ms — micro-interactions (press, toggle)
    base:  200,  // --dur 200ms      — standard transitions (fade, slide)
    slow:  320,  // --dur-slow 320ms — sheet slide, modal
    ring:  600,  // progress ring entrance
    sheet: 320,  // alias for slow (bottom sheet slide)
  },
} as const;

export type Motion = typeof motion;
