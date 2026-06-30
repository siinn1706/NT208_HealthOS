import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupportedLocale, type SupportedLocale } from './supported-locales';

const LOCALE_KEY = 'app.locale';

export async function getStoredLocale(): Promise<SupportedLocale | null> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    return isSupportedLocale(stored) ? stored : null;
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
