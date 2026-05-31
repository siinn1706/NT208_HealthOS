/* eslint-env jest */
import {
  preferenceToThemeSelection,
  themeSelectionToPreference,
} from '../theme/theme-preference-mapping';

describe('theme preference mapping', () => {
  it('maps mobile themes to the existing Core preference shape', () => {
    expect(themeSelectionToPreference('system')).toEqual({ theme_mode: 'system', accent_color: null });
    expect(themeSelectionToPreference('calm')).toEqual({ theme_mode: 'light', accent_color: '#1965B3' });
    expect(themeSelectionToPreference('night')).toEqual({ theme_mode: 'dark', accent_color: '#5BA8C8' });
    expect(themeSelectionToPreference('warm')).toEqual({ theme_mode: 'light', accent_color: '#B97843' });
  });

  it('derives mobile theme selection from Core preferences', () => {
    expect(preferenceToThemeSelection({ theme_mode: 'system', accent_color: null })).toBe('system');
    expect(preferenceToThemeSelection({ theme_mode: 'dark', accent_color: '#5BA8C8' })).toBe('night');
    expect(preferenceToThemeSelection({ theme_mode: 'light', accent_color: '#B97843' })).toBe('warm');
    expect(preferenceToThemeSelection({ theme_mode: 'light', accent_color: '#1965B3' })).toBe('calm');
  });
});
