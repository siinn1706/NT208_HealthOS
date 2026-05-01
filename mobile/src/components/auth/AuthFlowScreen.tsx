import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { AuthWelcomeScreen } from './auth-welcome-screen';
import { AuthSignInScreen } from './auth-sign-in-screen';
import { AuthSignUpScreen } from './auth-sign-up-screen';
import { AuthOtpScreen } from './auth-otp-screen';
import { AuthSetupScreen } from './auth-setup-screen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { PermissionsScreen } from './PermissionsScreen';

export type AuthKind = 'welcome' | 'sign-in' | 'sign-up' | 'otp' | 'setup' | 'forgot' | 'permissions';

interface AuthFlowScreenProps {
  kind: AuthKind;
  permissionKind?: 'notifications' | 'camera' | 'health-data';
}

export function AuthFlowScreen({ kind, permissionKind }: AuthFlowScreenProps) {
  const t = useTheme();
  const isWelcome = kind === 'welcome';

  function renderInner() {
    switch (kind) {
      case 'welcome':     return <AuthWelcomeScreen />;
      case 'sign-in':     return <AuthSignInScreen />;
      case 'sign-up':     return <AuthSignUpScreen />;
      case 'otp':         return <AuthOtpScreen />;
      case 'setup':       return <AuthSetupScreen />;
      case 'forgot':      return <ForgotPasswordScreen />;
      case 'permissions': return <PermissionsScreen kind={permissionKind ?? 'notifications'} />;
    }
  }

  if (isWelcome) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        {renderInner()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderInner()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
});
