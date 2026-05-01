import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/Chip';
import { Button } from '../primitives/Button';
import { IconVideo, IconMore } from '../../icons';

interface HeroAppointmentCardProps {
  countdown: string;
  doctor: string;
  specialty: string;
  location: string;
  type: string;
  onJoin?: () => void;
}

export function HeroAppointmentCard({ countdown, doctor, specialty, location, type, onJoin }: HeroAppointmentCardProps) {
  const t = useTheme();

  return (
    <LinearGradient
      colors={[t.brandDeep, t.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: t.radius.xl }]}
    >
      <Chip label={countdown} variant="brand" />
      <Text style={[typography.title, styles.doctor]}>{doctor}</Text>
      <Text style={[typography.caption, styles.sub]}>{specialty}</Text>
      <Text style={[typography.caption, styles.sub]}>{location}</Text>
      <View style={styles.actions}>
        <Button
          label="Join call"
          variant="solid"
          icon={<IconVideo size={16} color="#FFF" />}
          onPress={onJoin}
          style={StyleSheet.flatten([styles.joinBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }])}
        />
        <View style={[styles.moreBtn, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: t.radius.pill }]}>
          <IconMore size={18} color="#FFF" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card:    { padding: 20, marginVertical: 8, gap: 6 },
  doctor:  { color: '#FFF', marginTop: 8 },
  sub:     { color: 'rgba(255,255,255,0.75)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  joinBtn: { flex: 1 },
  moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
