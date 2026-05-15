import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
import { Button } from '../primitives/button';
import { IconVideo, IconMore, IconClock } from '../../icons';

interface HeroAppointmentCardProps {
  countdown: string;
  doctor: string;
  specialty: string;
  location: string;
  type: string;
  onJoin?: () => void;
  onMore?: () => void;
}

export function HeroAppointmentCard({ countdown, doctor, specialty, location, type, onJoin, onMore }: HeroAppointmentCardProps) {
  const t = useTheme();

  return (
    <LinearGradient
      colors={[t.brandDeep, t.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: t.radius.xl, overflow: 'hidden' }]}
    >
      {/* Decorative glow circles — depth layer */}
      <View style={styles.glowCircle1} pointerEvents="none" />
      <View style={styles.glowCircle2} pointerEvents="none" />
      <Chip label={countdown} variant="brand" icon={<IconClock size={11} color={t.brand} />} />
      <Text style={[typography.title, styles.doctor]}>{doctor}</Text>
      <Text style={[typography.caption, styles.sub]}>{specialty} · {type}</Text>
      <Text style={[typography.caption, styles.sub]}>{location}</Text>
      <View style={styles.actions}>
        <Button
          label="Join"
          variant="solid"
          icon={<IconVideo size={16} color={t.brand} />}
          onPress={onJoin}
          labelColor={t.brand}
          style={StyleSheet.flatten([styles.joinBtn, { backgroundColor: '#FFFFFF' }])}
        />
        {onMore && (
          <Pressable
            onPress={onMore}
            style={[styles.moreBtn, { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: t.radius.pill }]}
            accessibilityLabel="More options"
          >
            <IconMore size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card:       { padding: 20, marginBottom: 12, marginTop: 0, gap: 6 },
  glowCircle1:{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.10)', right: -30, top: -30 },
  glowCircle2:{ position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.06)', right: 20, bottom: -20 },
  doctor:  { color: '#FFF', marginTop: 8 },
  sub:     { color: 'rgba(255,255,255,0.75)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  joinBtn: { flex: 1 },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
