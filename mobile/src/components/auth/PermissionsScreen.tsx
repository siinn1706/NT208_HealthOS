import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { MissingApiState } from '../api/ApiState';

// ─── Permission config ────────────────────────────────────────────────────────

type PermissionKind = 'notifications' | 'camera' | 'health-data';

const PERMISSION_CONFIG: Record<PermissionKind, { icon: string; title: string; description: string }> = {
  notifications: {
    icon: '🔔',
    title: 'Stay on track',
    description: 'Allow notifications for medication reminders and health alerts',
  },
  camera: {
    icon: '📷',
    title: 'Snap your meals',
    description: 'Allow camera access to log meals with a photo',
  },
  'health-data': {
    icon: '❤️',
    title: 'Sync your health',
    description: 'Allow health data access for accurate tracking',
  },
};

// ─── PermissionsScreen ────────────────────────────────────────────────────────

interface PermissionsScreenProps {
  kind: PermissionKind;
  t: ReturnType<typeof useTheme>;
}

export function PermissionsScreen({ kind, t }: PermissionsScreenProps) {
  const config = PERMISSION_CONFIG[kind];
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.center}>
      <View style={[styles.iconBox, { backgroundColor: t.brandSoft }]}>
        <Text style={styles.iconEmoji}>{config.icon}</Text>
      </View>
      <Text style={[styles.title, { color: t.ink }]}>{config.title}</Text>
      <Text style={[styles.description, { color: t.ink3 }]}>{config.description}</Text>
      <MissingApiState title="Native permission flow unavailable" contract="unclear and needs manual confirmation" />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, loading && styles.disabled]}
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Loading...' : 'Allow'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnOutline, { borderColor: t.border }]}
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={[styles.btnLabelAlt, { color: t.ink }]}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 36 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  btnOutline: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    width: '100%',
  },
  btnLabel:    { fontSize: 16, fontWeight: '600' },
  btnLabelAlt: { fontSize: 16, fontWeight: '500' },
  disabled:    { opacity: 0.55 },
});
