export type MobileTheme = 'calm' | 'night' | 'warm';

export const THEME_CLASS: Record<MobileTheme, string> = {
  calm: 'theme-calm',
  night: 'theme-night',
  warm: 'theme-warm',
};

export const THEME_LABELS: Record<MobileTheme, string> = {
  calm: 'Calm Clinic',
  night: 'Night Sky',
  warm: 'Warm Care',
};

export const MOBILE_THEMES: MobileTheme[] = ['calm', 'night', 'warm'];

/** Parse `?t=` search param; returns 'calm' as default. */
export function parseTheme(value: string | null | undefined): MobileTheme {
  if (value === 'night' || value === 'warm') return value;
  return 'calm';
}

/** Returns the CSS class for a given theme key. */
export function themeClass(theme: MobileTheme): string {
  return THEME_CLASS[theme];
}
