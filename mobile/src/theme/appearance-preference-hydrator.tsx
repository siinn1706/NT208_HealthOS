import { useEffect } from 'react';
import { useSession } from '../auth/session-provider';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { preferenceService } from '../api/services/preference-service';
import { useThemeContext } from './theme-provider';
import { preferenceToThemeSelection } from './theme-preference-mapping';

export function AppearancePreferenceHydrator() {
  const { authenticated, booting } = useSession();
  const { setTheme } = useThemeContext();
  const enabled = authenticated && !booting;
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled });

  useEffect(() => {
    if (!enabled || !preferences.data) return;
    setTheme(preferenceToThemeSelection(preferences.data));
  }, [enabled, preferences.data, setTheme]);

  return null;
}
