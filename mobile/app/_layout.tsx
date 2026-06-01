import '../src/i18n';
import React, { useEffect } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/theme/theme-provider';
import { SessionProvider, useSession } from '../src/auth/session-provider';
import { AppLockProvider } from '../src/auth/app-lock-provider';
import { ToastProvider } from '../src/components/primitives/feedback/toast';
import { OfflineBanner } from '../src/components/api/offline-banner';
import { ThemedStatusBar } from '../src/components/primitives/themed-status-bar';
import { LanguagePreferenceHydrator } from '../src/i18n/language-preference-hydrator';
import { AppearancePreferenceHydrator } from '../src/theme/appearance-preference-hydrator';
import { getAuthGateRedirect } from '../src/auth/auth-route-policy';

SplashScreen.preventAutoHideAsync();

export function AuthGateStack() {
  const segments = useSegments();
  const { authenticated, booting, user } = useSession();
  if (booting) return null;

  const redirectHref = getAuthGateRedirect({
    authenticated,
    segments,
    onboardingStatus: user?.onboarding_status,
  });
  if (redirectHref) return <Redirect href={redirectHref} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <ToastProvider>
              <LanguagePreferenceHydrator />
              <AppearancePreferenceHydrator />
              <ThemedStatusBar />
              <AppLockProvider>
                <AuthGateStack />
                <OfflineBanner />
              </AppLockProvider>
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
