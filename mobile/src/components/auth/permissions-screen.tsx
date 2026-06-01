import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  titleKey: string;
  descriptionKey: string;
  features: { labelKey: string; Icon: React.ElementType }[];
}> = {
  notifications: {
    Icon: Bell,
    titleKey: 'auth.permissionsNotificationsTitle',
    descriptionKey: 'auth.permissionsNotificationsDescription',
    features: [
      { labelKey: 'auth.permissionsNotificationsFeatureMeds', Icon: Pill },
      { labelKey: 'auth.permissionsNotificationsFeatureAppointments', Icon: CalendarCheck },
      { labelKey: 'auth.permissionsNotificationsFeatureDigest', Icon: Sparkles },
    ],
  },
  camera: {
    Icon: Camera,
    titleKey: 'auth.permissionsCameraTitle',
    descriptionKey: 'auth.permissionsCameraDescription',
    features: [
      { labelKey: 'auth.permissionsCameraFeatureMeal', Icon: Coffee },
      { labelKey: 'auth.permissionsCameraFeaturePrescription', Icon: Pill },
      { labelKey: 'auth.permissionsCameraFeatureLab', Icon: Activity },
    ],
  },
  'health-data': {
    Icon: Activity,
    titleKey: 'auth.permissionsHealthTitle',
    descriptionKey: 'auth.permissionsHealthDescription',
    features: [
      { labelKey: 'auth.permissionsHealthFeatureHeart', Icon: Heart },
      { labelKey: 'auth.permissionsHealthFeatureSteps', Icon: Footprints },
      { labelKey: 'auth.permissionsHealthFeatureSleep', Icon: Moon },
    ],
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
  const { t: i18n } = useTranslation();
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
        {i18n(config.titleKey)}
      </Text>
      <Text style={[typography.body, { color: t.ink3, lineHeight: 22, marginBottom: 28 }]}>
        {i18n(config.descriptionKey)}
      </Text>

      {/* Feature rows */}
      <View style={styles.features}>
        {config.features.map(({ labelKey, Icon: FeatureIcon }) => (
          <View key={labelKey} style={[styles.featureRow, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
            <View style={[styles.checkCircle, { backgroundColor: t.brandSoft }]}>
              <FeatureIcon size={13} color={t.brand} />
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{i18n(labelKey)}</Text>
            <Check size={14} color={t.success} />
          </View>
        ))}
      </View>

      {/* Footer micro — between features and CTAs */}
      <View style={[styles.footerMicro, { marginBottom: 12 }]}>
        <Lock size={11} color={t.ink3} />
        <Text style={[typography.caption, { color: t.ink3, fontSize: 12, marginLeft: 4 }]}>
          {i18n('auth.permissionsPrivacyNote')}
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label={i18n('auth.continueSetup')} size="lg" onPress={continueToHome} />
        <Button label={i18n('auth.notNow')} variant="text" size="md" onPress={continueToHome} />
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
