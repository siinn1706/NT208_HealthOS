import '../src/i18n';
import React, { useEffect } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, Text, View } from 'react-native';
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
import { useTheme } from '../src/theme/useTheme';

SplashScreen.preventAutoHideAsync();

function AuthBootstrapLoader() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.bg, flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={t.brand} />
      <Text style={{ color: t.ink, fontSize: 13 }}>Starting HealthOS...</Text>
    </View>
  );
}

export function AuthGateStack({ fontsLoaded }: { fontsLoaded: boolean }) {
  const segments = useSegments();
  const { authenticated, booting, user } = useSession();

  useEffect(() => {
    if (fontsLoaded && !booting) {
      SplashScreen.hideAsync();
    }
  }, [booting, fontsLoaded]);

  if (!fontsLoaded) return null;
  if (booting) return <AuthBootstrapLoader />;

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
                <AuthGateStack fontsLoaded={fontsLoaded} />
                <OfflineBanner />
              </AppLockProvider>
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
