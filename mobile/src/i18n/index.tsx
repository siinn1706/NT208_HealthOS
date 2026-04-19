import React, { createContext, useContext, useMemo, useState } from "react";
import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import en from "./en.json";
import vi from "./vi.json";
import { savePreferencesCache } from "@/preferences/cache";

const i18n = new I18n({ en, vi });
i18n.enableFallback = true;
i18n.defaultLocale = "en";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
i18n.locale = deviceLang === "vi" ? "vi" : "en";

export type Locale = "en" | "vi";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  initialLocale?: Locale;
  children: React.ReactNode;
}

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  // Hydrate from the cached preference (passed in by `PreferencesGate`) when
  // available; otherwise fall back to the device language detected above.
  const seeded = initialLocale ?? (i18n.locale as Locale);
  if (initialLocale) i18n.locale = initialLocale;

  const [locale, setLocaleState] = useState<Locale>(seeded);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(next) {
        i18n.locale = next;
        setLocaleState(next);
        // Best-effort persist so the next cold start renders in this locale.
        void savePreferencesCache({ locale: next });
      },
      t(key, params) {
        return i18n.t(key, params);
      },
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx.t;
}

export function useLocale() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used within I18nProvider");
  return ctx;
}
