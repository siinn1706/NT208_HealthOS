import React, { createContext, useContext, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

import {
  DEFAULT_PREFERENCES,
  loadPreferencesCache,
  type CachedPreferences,
} from "./cache";

interface CtxValue extends CachedPreferences {
  ready: boolean;
}

const Ctx = createContext<CtxValue>({ ...DEFAULT_PREFERENCES, ready: false });

/**
 * Loads the on-disk preferences cache once and exposes it to children. Theme
 * + I18n providers consume `useInitialPreferences()` to seed their initial
 * state so the app does not flash from `system + en` into the user's chosen
 * theme on every cold start.
 */
export function PreferencesGate({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<CtxValue>({
    ...DEFAULT_PREFERENCES,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    loadPreferencesCache().then((cached) => {
      if (!cancelled) setValue({ ...cached, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!value.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInitialPreferences(): CachedPreferences {
  const v = useContext(Ctx);
  return {
    theme_mode: v.theme_mode,
    accent_color: v.accent_color,
    locale: v.locale,
  };
}
