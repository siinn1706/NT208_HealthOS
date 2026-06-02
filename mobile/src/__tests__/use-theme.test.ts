/* eslint-env jest */
import { renderHook } from '@testing-library/react-native';
import { useTheme } from '../theme/useTheme';
import { palettes } from '../theme/palettes';

// Provide a controllable ThemeContext
let mockThemeName: keyof typeof palettes = 'calm';
jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({
    name: mockThemeName,
    tokens: require('../theme/palettes').palettes[mockThemeName],
    setTheme: jest.fn(),
  }),
}));

describe('useTheme', () => {
  it('returns calm palette tokens by default', () => {
    mockThemeName = 'calm';
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(palettes.calm);
  });

  it('returns night palette tokens when theme is night', () => {
    mockThemeName = 'night';
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(palettes.night);
  });

  it('returns warm palette tokens when theme is warm', () => {
    mockThemeName = 'warm';
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(palettes.warm);
  });

  it('returned tokens contain required surface keys', () => {
    mockThemeName = 'calm';
    const { result } = renderHook(() => useTheme());
    const tokens = result.current;
    expect(tokens).toHaveProperty('bg');
    expect(tokens).toHaveProperty('card');
    expect(tokens).toHaveProperty('ink');
    expect(tokens).toHaveProperty('brand');
    expect(tokens).toHaveProperty('radius');
    expect(tokens).toHaveProperty('shadows');
  });
});
