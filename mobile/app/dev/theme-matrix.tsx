import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/useTheme';
import { useThemeContext } from '../../src/theme/theme-provider';
import { typography } from '../../src/theme/typography';
import type { ThemeName } from '../../src/theme/tokens';

if (!__DEV__) { throw new Error('theme-matrix is dev-only'); }

const THEMES: ThemeName[] = ['calm', 'night', 'warm'];

const ROUTES: { label: string; route: string }[] = [
  { label: 'Welcome',           route: '/auth/welcome' },
  { label: 'Sign in',           route: '/auth/sign-in' },
  { label: 'Sign up',           route: '/auth/sign-up' },
  { label: 'Home tab',          route: '/(tabs)/home' },
  { label: 'Today overview',    route: '/home/today' },
  { label: 'Health score',      route: '/home/score' },
  { label: 'Quick action',      route: '/home/quick-action' },
  { label: 'Care tab',          route: '/(tabs)/care' },
  { label: 'New appointment',   route: '/care/appointments/new' },
  { label: 'Medical history',   route: '/care/history' },
  { label: 'Attachments',       route: '/care/attachments' },
  { label: 'Lab reports',       route: '/care/lab-reports' },
  { label: 'Meds tab',          route: '/(tabs)/meds' },
  { label: 'Medication detail', route: '/meds/test-id' },
  { label: 'Medication history',route: '/meds/history' },
  { label: 'Add medication',    route: '/meds/add' },
  { label: 'Import medication', route: '/meds/import' },
  { label: 'Pause medication',  route: '/meds/pause/test-id' },
  { label: 'Refill log',        route: '/meds/refill/test-id' },
  { label: 'Chat tab',          route: '/(tabs)/chat' },
  { label: 'Profile tab',       route: '/(tabs)/me' },
  { label: 'Intake form',       route: '/forms/intake' },
  { label: 'Symptoms form',     route: '/forms/symptoms' },
  { label: 'Insurance form',    route: '/forms/insurance' },
  { label: 'Primitives',        route: '/dev/primitives' },
];

export default function ThemeMatrixScreen() {
  const t = useTheme();
  const { name, setTheme } = useThemeContext();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Text style={[typography.h3, { color: t.ink }]}>Theme Matrix</Text>
        <View style={s.themePills}>
          {THEMES.map(th => (
            <Pressable
              key={th}
              onPress={() => setTheme(th)}
              style={[
                s.themePill,
                { borderRadius: t.radius.pill, borderColor: t.border, backgroundColor: name === th ? t.brand : t.card },
              ]}
            >
              <Text style={[typography.micro, { color: name === th ? '#fff' : t.ink2 }]}>{th}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {ROUTES.map(r => (
          <Pressable
            key={r.route}
            onPress={() => router.push(r.route as never)}
            style={({ pressed }) => [
              s.row,
              { borderBottomColor: t.border },
              pressed && { backgroundColor: t.bgElev },
            ]}
          >
            <View>
              <Text style={[typography.body, { color: t.ink }]}>{r.label}</Text>
              <Text style={[typography.micro, { color: t.ink4 }]}>{r.route}</Text>
            </View>
            <Text style={[typography.caption, { color: t.brand }]}>→</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  header:     { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  themePills: { flexDirection: 'row', gap: 8 },
  themePill:  { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  list:       { paddingBottom: 40 },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
