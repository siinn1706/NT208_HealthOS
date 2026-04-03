"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { applyTokensToRoot, deriveAccentTokens, removeAccentOverrides } from "@/lib/accent-utils";

interface AccentColorContextValue {
  accentColor: string | null;
  setAccentColor: (hex: string | null) => void;
  applyAccent: (hex: string | null) => void;
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColor: null,
  setAccentColor: () => {},
  applyAccent: () => {},
});

export function AccentColorProvider({
  children,
  initialAccent = null,
}: {
  children: React.ReactNode;
  initialAccent?: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [accentColor, setAccentColorState] = useState<string | null>(initialAccent);
  const isDark = resolvedTheme === "dark";

  const applyAccent = useCallback(
    (hex: string | null) => {
      if (!hex) {
        removeAccentOverrides();
        return;
      }
      const tokens = deriveAccentTokens(hex, isDark);
      applyTokensToRoot(tokens);
    },
    [isDark],
  );

  useEffect(() => {
    applyAccent(accentColor);
  }, [accentColor, applyAccent]);

  const setAccentColor = useCallback(
    (hex: string | null) => {
      setAccentColorState(hex);
      applyAccent(hex);
    },
    [applyAccent],
  );

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor, applyAccent }}>
      {children}
    </AccentColorContext.Provider>
  );
}

export const useAccentColor = () => useContext(AccentColorContext);
