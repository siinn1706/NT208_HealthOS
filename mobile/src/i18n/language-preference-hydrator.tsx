import { useEffect, useRef } from 'react';
import type { UserPreference } from '../../../shared/api-contracts';
import { useSession } from '../auth/session-provider';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { preferenceService } from '../api/services/preference-service';
import i18n, { initLocaleFromStorage } from './index';
import { setStoredLocale } from './language-storage';

type Locale = UserPreference['locale'];

function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguagePreferenceHydrator() {
  const { authenticated, booting } = useSession();
  const enabled = authenticated && !booting;
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled });
  const storageHydrated = useRef(false);

  // Restore last-used locale from storage on first mount (works offline / pre-auth)
  useEffect(() => {
    if (storageHydrated.current) return;
    storageHydrated.current = true;
    void initLocaleFromStorage();
  }, []);

  // Apply server locale and persist it when auth resolves
  useEffect(() => {
    if (!enabled || !preferences.data?.locale) return;
    const nextLocale = normalizeLocale(preferences.data.locale);
    if (normalizeLocale(i18n.language) === nextLocale) return;
    void i18n.changeLanguage(nextLocale);
    void setStoredLocale(nextLocale);
  }, [enabled, preferences.data?.locale]);

  return null;
}
