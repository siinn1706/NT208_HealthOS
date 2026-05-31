import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconButton } from '../primitives/icon-button';
import { AuthWelcomeScreen } from './auth-welcome-screen';
import { AuthSignInScreen } from './auth-sign-in-screen';
import { AuthSignUpScreen } from './auth-sign-up-screen';
import { AuthOtpScreen } from './auth-otp-screen';
import { AuthSetupScreen } from './auth-setup-screen';
import { AuthForgotPasswordScreen } from './auth-forgot-password-screen';
import { PermissionsScreen } from './permissions-screen';
import { AuthMfaScreen } from './auth-mfa-screen';

export type AuthKind = 'welcome' | 'sign-in' | 'sign-up' | 'otp' | 'mfa' | 'setup' | 'forgot' | 'permissions';

interface AuthFlowScreenProps {
  kind: AuthKind;
  permissionKind?: 'notifications' | 'camera' | 'health-data';
}

function AuthFlowBody({ kind, permissionKind }: AuthFlowScreenProps) {
  switch (kind) {
    case 'welcome':     return <AuthWelcomeScreen />;
    case 'sign-in':     return <AuthSignInScreen />;
    case 'sign-up':     return <AuthSignUpScreen />;
    case 'otp':         return <AuthOtpScreen />;
    case 'mfa':         return <AuthMfaScreen />;
    case 'setup':       return <AuthSetupScreen />;
    case 'forgot':      return <AuthForgotPasswordScreen />;
    case 'permissions': return <PermissionsScreen kind={permissionKind ?? 'notifications'} />;
  }
}

export function AuthFlowScreen({ kind, permissionKind }: AuthFlowScreenProps) {
  const t = useTheme();
  const isWelcome = kind === 'welcome';
  const showHeader = !isWelcome;
  const showSkip = kind === 'permissions';

  if (isWelcome) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        <AuthFlowBody kind={kind} permissionKind={permissionKind} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      {showHeader && (
        <View style={[styles.header, { paddingHorizontal: 8 }]}>
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={18} color={t.ink} />}
            onPress={() => router.back()}
            accessibilityLabel="Back"
            size={40}
          />
          {showSkip && (
            <Pressable
              onPress={() => router.replace('/home')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip"
              style={styles.skipHit}
            >
              <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>
                Skip
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthFlowBody kind={kind} permissionKind={permissionKind} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, marginTop: 8 },
  skipHit: { paddingHorizontal: 8, paddingVertical: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
});
