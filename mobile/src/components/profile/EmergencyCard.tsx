import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconHeartPulse } from '../../icons';
import { Button } from '../primitives/Button';

interface EmergencyCardProps {
  onPress?: () => void;
}

export function EmergencyCard({ onPress }: EmergencyCardProps) {
  const t = useTheme();

  return (
    <LinearGradient
      colors={[t.danger, '#C0392B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: t.radius.xl }]}
    >
      <View style={styles.row}>
        <IconHeartPulse size={24} color="#FFF" />
        <View style={styles.text}>
          <Text style={[typography.bodyMed, styles.white]}>Emergency Info</Text>
          <Text style={[typography.caption, styles.dim]}>Share vitals & allergies instantly</Text>
        </View>
        <Button label="Share" variant="solid" onPress={onPress} style={styles.btn} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card:  { padding: 16, marginVertical: 8 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text:  { flex: 1 },
  white: { color: '#FFF' },
  dim:   { color: 'rgba(255,255,255,0.75)' },
  btn:   { backgroundColor: 'rgba(255,255,255,0.2)' },
});
