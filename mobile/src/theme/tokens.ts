import type { Shadows } from './shadows';
import type { Motion } from './motion';

export type ThemeName = 'calm' | 'night' | 'warm';

export interface ThemeTokens {
  // surfaces
  bg: string;
  bgElev: string;
  card: string;
  // text
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  // borders
  border: string;
  borderStrong: string;
  // brand (per-theme)
  brand: string;
  brandDeep: string;
  brandSoft: string;
  accent: string;
  chip: string;
  // semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  // warm accents (used cross-theme in KPIs & chat avatars)
  warmGold: string;
  warmPeach: string;
  warmRose: string;
  // semantic soft containers
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  // KPI tone accents
  toneWater: string;
  toneKcal: string;
  toneSleep: string;
  // radius
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    pill: number;
  };
  // spacing
  space: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
  };
  // depth
  shadows: Shadows;
  // motion
  motion: Motion;
}
