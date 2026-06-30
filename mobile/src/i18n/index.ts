import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import vi from './locales/vi.json';
import en from './locales/en.json';
import { getStoredLocale } from './language-storage';
import { DEFAULT_LOCALE, normalizeLocale } from './supported-locales';

const deviceLocale = normalizeLocale(getLocales()[0]?.languageCode, DEFAULT_LOCALE);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: deviceLocale,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
  });

/** Apply stored locale from AsyncStorage. Call once at app startup before server preference loads. */
export async function initLocaleFromStorage(): Promise<void> {
  const stored = await getStoredLocale();
  if (stored && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

export default i18n;
