let hasWarnedFallback = false;

/** Returns a dev-only WS base URL for emulator/sim (`:8000` direct to Core). */
export function getDevWsFallback(platform: string): string | null {
  if (!__DEV__) return null;
  if (platform === 'android') return 'ws://10.0.2.2:8000';
  return 'ws://localhost:8000';
}

/** Logs the dev-fallback warning once per process to avoid noise. */
export function warnFallbackOnce(): void {
  if (hasWarnedFallback) return;
  hasWarnedFallback = true;
  console.warn(
    '[dev-fallback] Routing WS direct to Core :8000; set EXPO_PUBLIC_WS_URL to use gateway',
  );
}
