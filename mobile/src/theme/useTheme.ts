import { useThemeContext } from './ThemeProvider';
import type { ThemeTokens } from './tokens';

export function useTheme(): ThemeTokens {
  return useThemeContext().tokens;
}
