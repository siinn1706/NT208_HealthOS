import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconHeartPulse, ChevronRight } from '../../icons';

interface EmergencyCardProps {
  onPress?: () => void;
  onShare?: () => void;
}

export function EmergencyCard({ onPress, onShare }: EmergencyCardProps) {
  const t = useTheme();

  return (
    <Pressable onPress={onShare ?? onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <LinearGradient
        colors={[t.danger, '#C73C3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: t.radius.xl }]}
      >
        <View style={styles.row}>
          <View style={[styles.iconTile, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: t.radius.md }]}>
            <IconHeartPulse size={24} color="#FFF" />
          </View>
          <View style={styles.text}>
            <Text style={[typography.bodyMed, styles.white, { fontSize: 16, fontWeight: '700' }]}>Emergency card</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: '500' }]}>Share vitals & allergies instantly</Text>
          </View>
          <ChevronRight size={18} color="#FFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:     { padding: 16, marginVertical: 8 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  text:     { flex: 1 },
  white:    { color: '#FFF' },
  dim:      { color: 'rgba(255,255,255,0.75)' },
});
