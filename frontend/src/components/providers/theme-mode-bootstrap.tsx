"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/** next-themes default localStorage key */
const THEME_STORAGE_KEY = "theme";

/**
 * When the user has no `theme` in localStorage (new device / cleared data),
 * apply the server-stored preference once so it matches the account.
 * If localStorage already has a value, the user's local choice wins.
 */
export function ThemeModeBootstrap({
  serverThemeMode,
}: {
  serverThemeMode: "system" | "light" | "dark" | null;
}) {
  const { setTheme } = useTheme();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (
      serverThemeMode !== "system" &&
      serverThemeMode !== "light" &&
      serverThemeMode !== "dark"
    ) {
      return;
    }
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(THEME_STORAGE_KEY) != null) return;
      setTheme(serverThemeMode);
    } catch {
      // ignore
    }
  }, [serverThemeMode, setTheme]);

  return null;
}
