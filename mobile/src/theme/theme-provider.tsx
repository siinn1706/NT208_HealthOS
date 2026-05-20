import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes } from './palettes';
import type { ThemeName, ThemeTokens } from './tokens';

const STORAGE_KEY = 'nt208_theme_override';

interface ThemeContextValue {
  name: ThemeName;
  tokens: ThemeTokens;
  setTheme: (name: ThemeName | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const systemTheme: ThemeName = scheme === 'dark' ? 'night' : 'calm';

  const [override, setOverride] = useState<ThemeName | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'calm' || val === 'night' || val === 'warm') setOverride(val);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const setTheme = useCallback((name: ThemeName | 'system') => {
    if (name === 'system') {
      setOverride(null);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    } else {
      setOverride(name);
      AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {});
    }
  }, []);

  // While AsyncStorage loads, render with the system theme to avoid a blank flash
  const name = (loaded ? override : null) ?? systemTheme;

  const value = useMemo(
    () => ({ name, tokens: palettes[name], setTheme }),
    [name, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used inside ThemeProvider');
  return ctx;
}
