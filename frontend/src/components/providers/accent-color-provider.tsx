"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
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
  const contextValue = useMemo(
    () => ({ accentColor, setAccentColor, applyAccent }),
    [accentColor, applyAccent, setAccentColor],
  );

  return (
    <AccentColorContext.Provider value={contextValue}>
      {children}
    </AccentColorContext.Provider>
  );
}

export const useAccentColor = () => use(AccentColorContext);
