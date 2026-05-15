import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell, Camera, Activity,
  Pill, CalendarCheck, Sparkles,
  Coffee, Heart, Footprints, Moon,
  Check, Lock,
} from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';

type PermissionKind = 'notifications' | 'camera' | 'health-data';

const CONFIG: Record<PermissionKind, {
  Icon: React.ElementType;
  title: string;
  description: string;
  features: { label: string; Icon: React.ElementType }[];
  ctaLabel: string;
}> = {
  notifications: {
    Icon: Bell,
    title: 'Turn on reminders',
    description: "We'll nudge you when it's time for medication or a scheduled appointment. Nothing else — ever.",
    features: [
      { label: 'Medication reminders', Icon: Pill },
      { label: 'Appointment alerts',   Icon: CalendarCheck },
      { label: 'Weekly health digest', Icon: Sparkles },
    ],
    ctaLabel: 'Allow notifications',
  },
  camera: {
    Icon: Camera,
    title: 'Snap meals & scans',
    description: 'Use your camera to log food, scan prescriptions, or capture lab reports. Images stay on your device unless you save them.',
    features: [
      { label: 'Log meals from photo',   Icon: Coffee },
      { label: 'Scan prescriptions',     Icon: Pill },
      { label: 'Capture lab reports',    Icon: Activity },
    ],
    ctaLabel: 'Allow camera',
  },
  'health-data': {
    Icon: Activity,
    title: 'Connect your health data',
    description: 'Link Apple Health, Google Health Connect, or a wearable to auto-sync vitals and activity. Read-only by default.',
    features: [
      { label: 'Heart rate & vitals', Icon: Heart },
      { label: 'Steps & activity',    Icon: Footprints },
      { label: 'Sleep tracking',      Icon: Moon },
    ],
    ctaLabel: 'Connect Health Connect',
  },
};

interface PermissionsScreenProps {
  kind: PermissionKind;
}

export function PermissionsScreen({ kind }: PermissionsScreenProps) {
  const t = useTheme();
  const config = CONFIG[kind];
  const { Icon } = config;
  function handleContinue() {
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.root}>
      {/* Hero icon tile — 64×64, gradient */}
      <LinearGradient
        colors={[t.brand, t.accent ?? t.brandDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Icon size={28} color="#FFFFFF" />
      </LinearGradient>

      {/* Title + description — left aligned */}
      <Text style={[typography.title, { color: t.ink, marginTop: 20, marginBottom: 8 }]}>
        {config.title}
      </Text>
      <Text style={[typography.body, { color: t.ink3, lineHeight: 22, marginBottom: 28 }]}>
        {config.description}
      </Text>

      {/* Feature rows */}
      <View style={styles.features}>
        {config.features.map(({ label, Icon: FeatureIcon }) => (
          <View key={label} style={[styles.featureRow, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
            <View style={[styles.checkCircle, { backgroundColor: t.brandSoft }]}>
              <FeatureIcon size={13} color={t.brand} />
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{label}</Text>
            <Check size={14} color={t.success} />
          </View>
        ))}
      </View>

      {/* Footer micro — between features and CTAs */}
      <View style={[styles.footerMicro, { marginBottom: 12 }]}>
        <Lock size={11} color={t.ink3} />
        <Text style={[typography.caption, { color: t.ink3, fontSize: 12, marginLeft: 4 }]}>
          Private by default · revoke anytime
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label={config.ctaLabel} size="lg" onPress={handleContinue} />
        <Button label="Not now" variant="text" size="md" onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, paddingTop: 32, paddingHorizontal: 24 },
  hero:        { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  features:    { width: '100%', gap: 10, marginBottom: 0 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 16, minHeight: 56 },
  checkCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerMicro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  ctas:        { width: '100%', gap: 12 },
});
