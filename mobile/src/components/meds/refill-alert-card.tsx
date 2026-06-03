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
    <View style={[styles.card, { backgroundColor: t.warningSoft, borderColor: `${t.warning}50`, borderRadius: t.radius.lg }]}>
      <View style={[styles.iconBox, { backgroundColor: `${t.warning}30` }]}>
        <IconAlert size={18} color={t.warning} />
      </View>
      <View style={styles.text}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{message}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{pharmacy} · Tap to request refill</Text>
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
  card:    { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12, marginVertical: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text:    { flex: 1 },
});
