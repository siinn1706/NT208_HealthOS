import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconAlert } from '../../icons';

interface RefillAlertCardProps {
  message: string;
  daysLeft: number;
}

export function RefillAlertCard({ message, daysLeft }: RefillAlertCardProps) {
  const t = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: `${t.warning}18`, borderColor: `${t.warning}40`, borderRadius: t.radius.lg }]}>
      <IconAlert size={18} color={t.warning} />
      <View style={styles.text}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{message}</Text>
        <Text style={[typography.caption, { color: t.warning }]}>Order refill now</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12, marginVertical: 4 },
  text: { flex: 1 },
});
