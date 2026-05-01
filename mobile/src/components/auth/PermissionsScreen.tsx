import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Camera, Activity, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';

type PermissionKind = 'notifications' | 'camera' | 'health-data';

const CONFIG: Record<PermissionKind, {
  Icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
}> = {
  notifications: {
    Icon: Bell,
    title: 'Stay on track',
    description: 'Allow notifications so HealthOS can remind you about medications, appointments, and health alerts.',
    features: ['Medication reminders', 'Appointment alerts', 'Health milestone updates'],
  },
  camera: {
    Icon: Camera,
    title: 'Snap your meals',
    description: 'Allow camera access to log meals with a photo and get AI-powered nutrition analysis.',
    features: ['Photo meal logging', 'AI nutrition insights', 'Receipt scanning'],
  },
  'health-data': {
    Icon: Activity,
    title: 'Sync your health',
    description: 'Allow health data access so HealthOS can track your activity and show accurate metrics.',
    features: ['Step and activity tracking', 'Heart rate monitoring', 'Sleep analysis'],
  },
};

interface PermissionsScreenProps {
  kind: PermissionKind;
  t?: ReturnType<typeof useTheme>;
}

export function PermissionsScreen({ kind }: PermissionsScreenProps) {
  const t = useTheme();
  const config = CONFIG[kind];
  const { Icon } = config;
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    setLoading(true);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.root}>
      {/* Gradient icon hero */}
      <LinearGradient
        colors={[t.brand, t.accent ?? t.brandDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Icon size={36} color="#FFFFFF" />
      </LinearGradient>

      <Text style={[typography.title, { color: t.ink, textAlign: 'center', marginTop: 20, marginBottom: 8 }]}>
        {config.title}
      </Text>
      <Text style={[typography.body, { color: t.ink3, textAlign: 'center', lineHeight: 22, marginBottom: 28 }]}>
        {config.description}
      </Text>

      {/* Feature cards */}
      <View style={styles.features}>
        {config.features.map((feat) => (
          <View key={feat} style={[styles.featureRow, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
            <View style={[styles.checkCircle, { backgroundColor: t.brandSoft }]}>
              <Check size={13} color={t.brand} />
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label="Allow" size="lg" loading={loading} onPress={handleContinue} />
        <TouchableOpacity style={styles.ghostBtn} onPress={handleContinue}>
          <Text style={[typography.button, { color: t.ink3 }]}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  hero:         { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  features:     { width: '100%', gap: 10, marginBottom: 28 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  checkCircle:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctas:         { width: '100%', gap: 12 },
  ghostBtn:     { height: 48, alignItems: 'center', justifyContent: 'center' },
});
