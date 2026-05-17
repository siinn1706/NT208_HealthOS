import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { authService } from '../../api/services';
import { useSession } from '../../auth/session-provider';
import { GoogleMark } from '../../icons/oauth/google-mark';
import { AppleMark } from '../../icons/oauth/apple-mark';

export function AuthSignInScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length >= 1;

  async function handleSignIn() {
    if (!isValid) { setError(i18n('auth.emailPasswordRequired')); return; }
    setLoading(true);
    setError(null);
    try {
      await session.signIn(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('auth.unableToSignIn'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Logo */}
      <View style={styles.logoRow}>
        <LinearGradient colors={[t.brand, t.brandDeep]} style={styles.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={[typography.h3, { color: '#FFF', fontFamily: 'Inter_800ExtraBold' }]}>H</Text>
        </LinearGradient>
      </View>

      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>{i18n('auth.welcomeBack')}</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>{i18n('auth.signInToContinue')}</Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <View style={styles.fieldGroup}>
        <Input
          label={i18n('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder={i18n('auth.emailPlaceholder')}
          leadingIcon={<User size={18} color={t.ink3} />}
        />

        <Input
          label={i18n('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPw}
          autoComplete="password"
          textContentType="password"
          placeholder={i18n('auth.passwordPlaceholder')}
          leadingIcon={<Lock size={18} color={t.ink3} />}
          trailingText={showPw ? i18n('auth.hidePassword') : i18n('auth.showPassword')}
          onTrailingPress={() => setShowPw((v) => !v)}
        />
      </View>

      <View style={styles.forgotRow}>
        <TouchableOpacity onPress={() => router.push('/auth/forgot' as never)} accessibilityRole="button" accessibilityLabel={i18n('auth.forgotPassword')}>
          <Text style={[typography.caption, { color: t.brand }]}>{i18n('auth.forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      <Button label={i18n('auth.signIn')} size="lg" loading={loading} onPress={handleSignIn} style={styles.mainBtn} />

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.divLine, { backgroundColor: t.border }]} />
        <Text style={[typography.caption, { color: t.ink4, marginHorizontal: 12, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold' }]}>
          {i18n('common.orContinueWith')}
        </Text>
        <View style={[styles.divLine, { backgroundColor: t.border }]} />
      </View>

      {/* OAuth row */}
      <View style={styles.oauthRow}>
        <TouchableOpacity style={[styles.oauthBtn, { borderColor: t.borderStrong, backgroundColor: t.card }]} accessibilityRole="button" accessibilityLabel={i18n('auth.continueWithGoogle')}>
          <GoogleMark size={20} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.oauthBtn, { borderColor: t.borderStrong, backgroundColor: t.card }]} accessibilityRole="button" accessibilityLabel={i18n('auth.continueWithApple')}>
          <AppleMark size={20} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>Apple</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/sign-up')} accessibilityRole="button" accessibilityLabel={i18n('auth.createAccount')}>
        <Text style={[typography.caption, { color: t.ink3 }]}>{i18n('auth.newHere')}</Text>
        <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>{i18n('auth.createAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow:    { alignItems: 'flex-start', marginBottom: 24 },
  logoBox:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { gap: 14, marginBottom: 4 },
  forgotRow:  { alignItems: 'flex-end', marginBottom: 12 },
  mainBtn:    { marginTop: 4 },
  divider:    { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine:    { flex: 1, height: StyleSheet.hairlineWidth },
  oauthRow:   { flexDirection: 'row', gap: 12 },
  oauthBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1 },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
