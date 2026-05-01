'use client';

import { useSearchParams } from 'next/navigation';
import { parseTheme, themeClass, type MobileTheme } from './theme';

export function useMobileThemeParam(): {
  /** Raw query value for links: calm | night | warm */
  t: MobileTheme;
  /** `theme-calm` / `theme-night` / `theme-warm` for PhoneShell */
  theme: 'theme-calm' | 'theme-night' | 'theme-warm';
} {
  const sp = useSearchParams();
  const t = parseTheme(sp.get('t'));
  return { t, theme: themeClass(t) as 'theme-calm' | 'theme-night' | 'theme-warm' };
}

export function useMobileTQuery(): string {
  const { t } = useMobileThemeParam();
  return `t=${t}`;
}
