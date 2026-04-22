import { apiFetch, unwrapData } from "../client";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Mirrors backend `app/schemas/preferences.py:UserPreferenceData`.
 * `accent_color` is nullable on the server when the user has never picked one
 * (defaults exposed via `_default_prefs()` in `backend/app/api/v1/endpoints/preferences.py`).
 */
export type PreferenceLocale = "en" | "vi";

export interface UserPreferences {
  theme_mode: ThemeMode;
  accent_color: string | null;
  locale: PreferenceLocale;
}

export interface UserPreferencesUpdate {
  theme_mode?: ThemeMode;
  accent_color?: string;
  locale?: PreferenceLocale;
}

function normalizePreferences(raw: UserPreferences & { locale?: string }): UserPreferences {
  return {
    theme_mode: raw.theme_mode,
    accent_color: raw.accent_color ?? null,
    locale: raw.locale === "vi" ? "vi" : "en",
  };
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const res = await apiFetch<{ data: UserPreferences } | UserPreferences>(
    "/v1/preferences/me"
  );
  return normalizePreferences(unwrapData(res) as UserPreferences & { locale?: string });
}

export async function patchPreferences(
  payload: UserPreferencesUpdate
): Promise<UserPreferences> {
  const res = await apiFetch<{ data: UserPreferences } | UserPreferences>(
    "/v1/preferences/me",
    { method: "PATCH", body: payload }
  );
  return normalizePreferences(unwrapData(res) as UserPreferences & { locale?: string });
}
