import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { View } from "react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import { ThemeProvider, useTheme } from "@/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/states/OfflineBanner";
import { NetworkProvider } from "@/hooks/useNetworkStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createQueryClient } from "@/api/queryClient";
import { PreferencesGate, useInitialPreferences } from "@/preferences/PreferencesGate";
import { useHealthConnectForegroundSync } from "@/healthconnect/useForegroundSync";

const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesGate>
          <SeededProviders />
        </PreferencesGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Reads the cached preferences once (loaded by `PreferencesGate`) and seeds
 * the I18n and Theme providers so the very first frame already shows the
 * user's last theme + locale instead of `system + en` until the network
 * preferences arrive.
 */
function SeededProviders() {
  const seed = useInitialPreferences();
  return (
    <I18nProvider initialLocale={seed.locale}>
      <ThemeProvider
        initialMode={seed.theme_mode}
        initialAccent={seed.accent_color}
      >
        <NetworkProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ErrorBoundary>
                <AuthProvider>
                  <ThemedShell />
                </AuthProvider>
              </ErrorBoundary>
            </ToastProvider>
          </QueryClientProvider>
        </NetworkProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

function ThemedShell() {
  const { scheme, colors } = useTheme();
  // Health Connect foreground auto-sync — runs once on cold start (after
  // auth is established) and on every foreground transition. Debounced
  // server-side via expo-secure-store so we don't hammer the SDK or BE.
  // Lives at the shell level so it survives screen navigation.
  useHealthConnectForegroundSync();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      />
    </View>
  );
}
