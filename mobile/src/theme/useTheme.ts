import { useThemeContext } from './theme-provider';
import type { ThemeTokens } from './tokens';

export function useTheme(): ThemeTokens {
  return useThemeContext().tokens;
}
