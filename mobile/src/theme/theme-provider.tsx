import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'calm' || val === 'night' || val === 'warm') {
        setOverride(val);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((name: ThemeName | 'system') => {
    if (name === 'system') {
      setOverride(null);
      AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      setOverride(name);
      AsyncStorage.setItem(STORAGE_KEY, name);
    }
  }, []);

  const name = override ?? systemTheme;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ name, tokens: palettes[name], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used inside ThemeProvider');
  return ctx;
}
