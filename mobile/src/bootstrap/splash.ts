import * as SplashScreen from "expo-splash-screen";

/**
 * Holds the native splash visible until the app calls `releaseSplash()`. We
 * do this so the user never sees a flash of "ActivityIndicator on background
 * color" between the native splash hiding and the seeded providers mounting.
 *
 * Called at module-load time of the app entry — the earliest synchronous
 * point we can reach. Failures are swallowed because they only affect
 * cosmetics, not correctness.
 */
SplashScreen.preventAutoHideAsync().catch(() => undefined);

let released = false;

/**
 * Hide the native splash. Idempotent — safe to call from multiple gates as
 * they finish (preferences hydrated, icon fonts loaded, auth bootstrapped).
 */
export function releaseSplash(): void {
  if (released) return;
  released = true;
  SplashScreen.hideAsync().catch(() => undefined);
}
