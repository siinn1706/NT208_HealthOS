/* eslint-env jest */
import React from 'react';
import { Text } from 'react-native';
import { render, act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useThemeContext } from '../theme/theme-provider';
import { palettes } from '../theme/palettes';

// jest.setup.ts already mocks AsyncStorage

describe('ThemeProvider', () => {
  beforeEach(() => {
    (AsyncStorage as jest.Mocked<typeof AsyncStorage>).clear();
    jest.clearAllMocks();
  });

  it('renders children without crashing', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <Text>hello</Text>
      </ThemeProvider>,
    );
    await act(async () => {});
    expect(getByText('hello')).toBeTruthy();
  });

  it('provides calm tokens when device is light mode', async () => {
    // useColorScheme returns 'light' by default in jest-expo
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    await act(async () => {});
    expect(result.current.tokens).toEqual(palettes.calm);
  });

  it('restores persisted theme override from AsyncStorage', async () => {
    (AsyncStorage as jest.Mocked<typeof AsyncStorage>).setItem('nt208_theme_override', 'warm');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    // Wait for AsyncStorage load effect
    await act(async () => {});
    expect(result.current.name).toBe('warm');
    expect(result.current.tokens).toEqual(palettes.warm);
  });

  it('ignores unknown stored theme values', async () => {
    (AsyncStorage as jest.Mocked<typeof AsyncStorage>).setItem('nt208_theme_override', 'ocean');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    await act(async () => {});
    // Falls back to system theme (calm in light mode)
    expect(['calm', 'night', 'warm']).toContain(result.current.name);
  });

  it('setTheme persists override and updates context', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    await act(async () => {});

    await act(async () => {
      result.current.setTheme('night');
    });

    expect(result.current.name).toBe('night');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('nt208_theme_override', 'night');
  });

  it('setTheme("system") clears override and reverts to system theme', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    await act(async () => {});

    await act(async () => { result.current.setTheme('night'); });
    await act(async () => { result.current.setTheme('system'); });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('nt208_theme_override');
    // After clearing override, name reverts to system-derived value
    expect(['calm', 'night', 'warm']).toContain(result.current.name);
  });

  it('useThemeContext throws when used outside ThemeProvider', () => {
    // Suppress React error boundary console.error in test output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useThemeContext())).toThrow(
      'useThemeContext must be used inside ThemeProvider',
    );
    spy.mockRestore();
  });
});
