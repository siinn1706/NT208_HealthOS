import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { HeartPulse } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';

export function AuthWelcomeScreen() {
  const t = useTheme();

  return (
    <View style={styles.root}>
      {/* Logo hero — outer glow ring + gradient tile */}
      <View style={styles.logoArea}>
        {/* Outer soft halo */}
        <View style={[styles.logoHalo, { backgroundColor: `${t.brand}20` }]}>
          {/* Inner glow ring */}
          <View style={[styles.logoRing, { backgroundColor: t.brandSoft }]}>
            <LinearGradient
              colors={[t.brand, t.accent ?? t.brandDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoGlow, { shadowColor: t.brand }]}
            >
              <HeartPulse size={38} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Hero text */}
      <View style={styles.heroText}>
        <Text style={[typography.display, { color: t.ink, textAlign: 'center', fontFamily: 'Inter_800ExtraBold', lineHeight: 34 }]}>
          {'Your health,\nin one calm place'}
        </Text>
        <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 10, lineHeight: 22 }]}>
          Track vitals, manage medications, chat with care — all private, all yours.
        </Text>
      </View>

      {/* Dots (static decorative) */}
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive, { backgroundColor: t.brand }]} />
        <View style={[styles.dot, { backgroundColor: t.border }]} />
        <View style={[styles.dot, { backgroundColor: t.border }]} />
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label="Get started" size="lg" onPress={() => router.push('/auth/sign-up')} />
        <Button variant="text" label="I already have an account" size="md" onPress={() => router.push('/auth/sign-in')} />
        <Text style={[typography.caption, { color: t.ink4, textAlign: 'center', fontSize: 12, lineHeight: 16, marginTop: 8 }]}>
          By continuing, you agree to our Terms &amp; Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, alignItems: 'center', paddingTop: 20 },
  logoArea:   { alignItems: 'center', paddingHorizontal: 28, paddingTop: 24 },
  logoHalo:   { borderRadius: 100, padding: 12, alignItems: 'center', justifyContent: 'center' },
  logoRing:   { borderRadius: 100, padding: 8, alignItems: 'center', justifyContent: 'center' },
  logoGlow:   { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 16 },
  heroText:   { paddingHorizontal: 28, alignItems: 'center', marginTop: 24 },
  dots:       { flexDirection: 'row', gap: 6, marginTop: 24 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  dotActive:  { width: 18 },
  ctas:       { width: '100%', paddingHorizontal: 28, gap: 10, marginTop: 32 },
});
