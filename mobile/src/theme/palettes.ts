import type { ThemeTokens } from './tokens';

const shared = {
  success: '#059669',
  warning: '#D97706',
  danger: '#E54D4D',
  info: '#0284C7',
  primary: '#1965B3',
  primaryDeep: '#0E3D7A',
  primaryInk: '#FFFFFF',
  warmGold: '#B97843',
  warmPeach: '#E8A87C',
  warmRose: '#D4849A',
  radius: { sm: 10, md: 14, lg: 16, xl: 20, xxl: 24, pill: 100 },
  space: { 1: 4, 2: 8, 3: 12, 4: 14, 5: 16, 6: 18, 7: 20, 8: 24 },
} as const;

export const calmPalette: ThemeTokens = {
  ...shared,
  bg: '#F4FCFE',
  bgElev: '#FFFFFF',
  card: '#FFFFFF',
  ink: '#0F2743',
  ink2: '#1A4474',
  ink3: '#5B90C4',
  ink4: '#8FA5BD',
  border: '#DCEFF7',
  borderStrong: '#B8D9EA',
  brand: '#1965B3',
  brandSoft: '#E8F8FD',
  accent: '#41BCE6',
  chip: '#E8F8FD',
};

export const nightPalette: ThemeTokens = {
  ...shared,
  bg: '#0B0F14',
  bgElev: '#141A22',
  card: '#151C27',
  ink: '#EAEEF2',
  ink2: '#C7D1DC',
  ink3: '#8296AC',
  ink4: '#5E7289',
  border: 'rgba(138,162,180,0.14)',
  borderStrong: 'rgba(138,162,180,0.24)',
  brand: '#5BA8C8',
  brandSoft: 'rgba(91,168,200,0.14)',
  accent: '#7EC8D8',
  chip: 'rgba(91,168,200,0.12)',
};

export const warmPalette: ThemeTokens = {
  ...shared,
  bg: '#FAF6EF',
  bgElev: '#FFFDF8',
  card: '#FFFDF8',
  ink: '#2A2418',
  ink2: '#4D4332',
  ink3: '#8A7C63',
  ink4: '#B3A68A',
  border: '#EEE4CF',
  borderStrong: '#E2D3B0',
  brand: '#B97843',
  brandSoft: '#F6EADC',
  accent: '#D4A06A',
  chip: '#F4E7CE',
};

export const palettes: Record<import('./tokens').ThemeName, ThemeTokens> = {
  calm: calmPalette,
  night: nightPalette,
  warm: warmPalette,
};
