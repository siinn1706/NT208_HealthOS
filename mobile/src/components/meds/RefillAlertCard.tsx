import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconAlert, ChevronRight } from '../../icons';

interface RefillAlertCardProps {
  message: string;
  daysLeft: number;
  pharmacy?: string;
  onPress?: () => void;
}

export function RefillAlertCard({ message, daysLeft: _daysLeft, pharmacy = 'Pharmacy', onPress }: RefillAlertCardProps) {
  const t = useTheme();

  const inner = (
    <View style={[styles.card, { backgroundColor: t.warmPeach, borderColor: `${t.warmGold}40`, borderRadius: t.radius.lg }]}>
      <IconAlert size={18} color={t.warmGold} />
      <View style={styles.text}>
        <Text style={[typography.bodyMed, { color: t.ink, fontSize: 14, fontWeight: '700' }]}>{message}</Text>
        <Text style={[typography.caption, { color: t.ink3, fontSize: 13, fontWeight: '500' }]}>{pharmacy} · Tap to request refill</Text>
      </View>
      <ChevronRight size={16} color={t.ink4} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75 }}>
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12, marginVertical: 4 },
  text: { flex: 1 },
});
