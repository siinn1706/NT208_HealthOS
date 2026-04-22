import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import { FALLBACK_ACCENT_HEX, deriveMobileAccentColors } from "./accent";
import { darkPalette, lightPalette, type ThemeColors } from "./colors";
import { elevation, fontFamilies, fontWeights, radius, spacing, typography } from "./tokens";
import { savePreferencesCache } from "@/preferences/cache";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: "light" | "dark";
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fontFamilies: typeof fontFamilies;
  fontWeights: typeof fontWeights;
  elevation: typeof elevation;
  accentColor: string;
  /** No-op when called with null/empty so a stray `null` from preferences
   *  never poisons `colors.brand`. */
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string | null | undefined) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  initialMode?: ThemeMode;
  initialAccent?: string | null;
  children: React.ReactNode;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeAccent(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : null;
}

export function ThemeProvider({
  initialMode = "system",
  initialAccent,
  children,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() ?? "light");
  const [accentColor, setAccentColorState] = useState<string>(
    normalizeAccent(initialAccent) ?? FALLBACK_ACCENT_HEX
  );

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void savePreferencesCache({ theme_mode: next });
  }, []);

  const setAccentColor = useCallback(
    (input: string | null | undefined) => {
      const next = normalizeAccent(input);
      if (next) {
        setAccentColorState(next);
        void savePreferencesCache({ accent_color: next });
      }
    },
    []
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? "light");
    });
    return () => sub.remove();
  }, []);

  const scheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const basePalette = scheme === "dark" ? darkPalette : lightPalette;
    const derived = deriveMobileAccentColors(accentColor, scheme === "dark");
    const colors: ThemeColors = {
      ...basePalette,
      brand: derived.brand,
      brandMuted: derived.brandMuted,
      brandText: derived.brandText,
      ring: derived.ring,
      card: basePalette.surface,
      field: basePalette.inputBackground,
      accentSoft: derived.brandMuted,
    };
    return {
      mode,
      scheme,
      colors,
      spacing,
      radius,
      typography,
      fontFamilies,
      fontWeights,
      elevation,
      accentColor,
      setMode,
      setAccentColor,
    };
  }, [mode, scheme, accentColor, setMode, setAccentColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
