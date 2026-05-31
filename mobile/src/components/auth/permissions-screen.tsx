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
    title: 'Review reminder settings',
    description: 'Notification delivery is controlled from reminder preferences. This Expo build does not request OS push permissions here.',
    features: [
      { label: 'Medication reminders can be configured later', Icon: Pill },
      { label: 'Appointment alerts use Core preferences',       Icon: CalendarCheck },
      { label: 'Weekly digest controls stay account-backed',    Icon: Sparkles },
    ],
    ctaLabel: 'Continue',
  },
  camera: {
    Icon: Camera,
    title: 'Camera access when needed',
    description: 'Camera permission is requested inside the specific scan flow. This setup screen does not grant camera access.',
    features: [
      { label: 'Meal photo scan asks at capture time', Icon: Coffee },
      { label: 'Prescription scan remains guarded',    Icon: Pill },
      { label: 'Lab report capture is not shipped yet', Icon: Activity },
    ],
    ctaLabel: 'Continue',
  },
  'health-data': {
    Icon: Activity,
    title: 'Health Connect status',
    description: 'Core device identity is supported. Real Health Connect permission reads need an Android development build with native support.',
    features: [
      { label: 'Heart rate sync requires native module', Icon: Heart },
      { label: 'Steps sync requires native module',      Icon: Footprints },
      { label: 'Sleep sync requires native module',      Icon: Moon },
    ],
    ctaLabel: 'Continue',
  },
};

interface PermissionsScreenProps {
  kind: PermissionKind;
}

function continueToHome() {
  router.replace('/home');
}

export function PermissionsScreen({ kind }: PermissionsScreenProps) {
  const t = useTheme();
  const config = CONFIG[kind];
  const { Icon } = config;

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
          Private by default · enable only from supported feature screens
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label={config.ctaLabel} size="lg" onPress={continueToHome} />
        <Button label="Not now" variant="text" size="md" onPress={continueToHome} />
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
