import type { UserPreference } from '../../../shared/api-contracts';
import type { ThemeName } from './tokens';

export type ThemeSelection = ThemeName | 'system';

const THEME_ACCENTS: Record<ThemeName, string> = {
  calm: '#1965B3',
  night: '#5BA8C8',
  warm: '#B97843',
};

export function themeSelectionToPreference(selection: ThemeSelection): Pick<UserPreference, 'theme_mode' | 'accent_color'> {
  if (selection === 'system') {
    return { theme_mode: 'system', accent_color: null };
  }
  return {
    theme_mode: selection === 'night' ? 'dark' : 'light',
    accent_color: THEME_ACCENTS[selection],
  };
}

export function preferenceToThemeSelection(
  preference?: Pick<UserPreference, 'theme_mode' | 'accent_color'> | null,
): ThemeSelection {
  if (!preference || preference.theme_mode === 'system') return 'system';
  if (preference.theme_mode === 'dark') return 'night';
  return preference.accent_color?.toUpperCase() === THEME_ACCENTS.warm ? 'warm' : 'calm';
}
