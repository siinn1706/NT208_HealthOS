import { useEffect } from 'react';
import type { UserPreference } from '../../../shared/api-contracts';
import { useSession } from '../auth/session-provider';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { preferenceService } from '../api/services/preference-service';
import i18n from './index';

type Locale = UserPreference['locale'];

function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguagePreferenceHydrator() {
  const { authenticated, booting } = useSession();
  const enabled = authenticated && !booting;
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled });

  useEffect(() => {
    if (!enabled || !preferences.data?.locale) return;
    const nextLocale = normalizeLocale(preferences.data.locale);
    if (normalizeLocale(i18n.language) === nextLocale) return;
    void i18n.changeLanguage(nextLocale);
  }, [enabled, preferences.data?.locale]);

  return null;
}
