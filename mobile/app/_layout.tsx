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
import { ToastProvider } from '../src/components/primitives/feedback/toast';
import { OfflineBanner } from '../src/components/api/offline-banner';
import { ThemedStatusBar } from '../src/components/primitives/themed-status-bar';
import { LanguagePreferenceHydrator } from '../src/i18n/language-preference-hydrator';

SplashScreen.preventAutoHideAsync();

function AuthGateStack() {
  const segments = useSegments();
  const { authenticated, booting } = useSession();
  if (booting) return null;

  const root = segments[0] ?? '';
  const isPublic =
    root === 'auth'
    || root === 'onboarding'
    || (__DEV__ && root === 'dev');

  if (!authenticated && !isPublic) {
    return <Redirect href="/auth/welcome" />;
  }
  if (authenticated && root === 'auth') {
    return <Redirect href="/home" />;
  }
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
              <ThemedStatusBar />
              <AuthGateStack />
              <OfflineBanner />
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
