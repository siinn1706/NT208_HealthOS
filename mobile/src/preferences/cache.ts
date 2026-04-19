import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local cache of UI preferences so the app boots in the user's last theme
 * + locale instead of `system + defaultBrand + en`. The server is still the
 * source of truth (the Preferences screen pushes the local value into both
 * the cache and the backend); this is purely a no-flash hydrator for cold
 * starts and offline launches.
 */

const KEY = "healthos.preferences.cache.v1";

export type ThemeMode = "light" | "dark" | "system";
export type Locale = "en" | "vi";

export interface CachedPreferences {
  theme_mode: ThemeMode;
  accent_color: string | null;
  locale: Locale;
}

export const DEFAULT_PREFERENCES: CachedPreferences = {
  theme_mode: "system",
  accent_color: null,
  locale: "en",
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VALID_THEME = new Set<ThemeMode>(["light", "dark", "system"]);
const VALID_LOCALE = new Set<Locale>(["en", "vi"]);

function sanitize(input: unknown): CachedPreferences {
  const out: CachedPreferences = { ...DEFAULT_PREFERENCES };
  if (!input || typeof input !== "object") return out;
  const o = input as Record<string, unknown>;
  if (typeof o.theme_mode === "string" && VALID_THEME.has(o.theme_mode as ThemeMode)) {
    out.theme_mode = o.theme_mode as ThemeMode;
  }
  if (typeof o.accent_color === "string" && HEX_COLOR_RE.test(o.accent_color)) {
    out.accent_color = o.accent_color;
  }
  if (typeof o.locale === "string" && VALID_LOCALE.has(o.locale as Locale)) {
    out.locale = o.locale as Locale;
  }
  return out;
}

export async function loadPreferencesCache(): Promise<CachedPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferencesCache(
  patch: Partial<CachedPreferences>
): Promise<void> {
  try {
    const current = await loadPreferencesCache();
    const next = sanitize({ ...current, ...patch });
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best-effort; cache is just a no-flash hint.
  }
}
