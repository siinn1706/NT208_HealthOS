import { StatusBar } from 'expo-status-bar';
import { useThemeContext } from '../../theme/theme-provider';

export function ThemedStatusBar() {
  const { name } = useThemeContext();
  return <StatusBar style={name === 'night' ? 'light' : 'dark'} />;
}
