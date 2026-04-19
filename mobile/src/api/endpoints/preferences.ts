import { apiFetch, unwrapData } from "../client";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Mirrors backend `app/schemas/preferences.py:UserPreferenceData`.
 * `accent_color` is nullable on the server when the user has never picked one
 * (defaults exposed via `_default_prefs()` in `backend/app/api/v1/endpoints/preferences.py`).
 */
export interface UserPreferences {
  theme_mode: ThemeMode;
  accent_color: string | null;
}

export interface UserPreferencesUpdate {
  theme_mode?: ThemeMode;
  accent_color?: string;
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const res = await apiFetch<{ data: UserPreferences } | UserPreferences>(
    "/v1/preferences/me"
  );
  return unwrapData(res);
}

export async function patchPreferences(
  payload: UserPreferencesUpdate
): Promise<UserPreferences> {
  const res = await apiFetch<{ data: UserPreferences } | UserPreferences>(
    "/v1/preferences/me",
    { method: "PATCH", body: payload }
  );
  return unwrapData(res);
}
