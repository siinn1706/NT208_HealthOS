/**
 * Canonical per-metric color map.
 *
 * All metric colors live here so VitalTile, VitalsLineChart, and any future
 * chart surfaces stay visually consistent without independently hard-coding
 * hex values.
 *
 * Values correspond 1-to-1 with the Night Sky chart tokens defined in
 * globals.css (--chart-1 through --chart-5). Using hex directly so the map
 * works for both CSS (inline styles) and ECharts (which cannot resolve CSS
 * variables at render time).
 *
 * Light-mode token mapping:
 *   chart-1 (#1965B3) → primary blue    → BP systolic
 *   chart-2 (#41BCE6) → cyan            → heart rate, steps
 *   chart-3 (#6DE7F7) → teal            → SpO2, diastolic
 *   chart-4 (#E7DEA7) → warm gold       → weight, sleep
 *   chart-5 (#E3B79A) → warm peach      → glucose
 */
export const METRIC_COLORS = {
  hr:        "#41BCE6", // chart-2 cyan
  systolic:  "#1965B3", // chart-1 blue (primary BP)
  diastolic: "#6DE7F7", // chart-3 teal (secondary BP)
  weight:    "#E7DEA7", // chart-4 warm gold
  steps:     "#41BCE6", // chart-2 cyan
  sleep:     "#E7DEA7", // chart-4 warm gold
  spo2:      "#6DE7F7", // chart-3 teal
  glucose:   "#E3B79A", // chart-5 warm peach
} as const;

export type MetricKey = keyof typeof METRIC_COLORS;
