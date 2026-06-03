import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCALE_KEY = 'app.locale';

export type SupportedLocale = 'vi' | 'en';

export function isValidLocale(value: unknown): value is SupportedLocale {
  return value === 'vi' || value === 'en';
}

export async function getStoredLocale(): Promise<SupportedLocale | null> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    return isValidLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function setStoredLocale(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Storage write failure is non-fatal; in-memory locale already applied
  }
}
