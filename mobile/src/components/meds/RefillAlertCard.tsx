import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconAlert } from '../../icons';

interface RefillAlertCardProps {
  message: string;
  daysLeft: number;
  onPress?: () => void;
}

export function RefillAlertCard({ message, daysLeft, onPress }: RefillAlertCardProps) {
  const t = useTheme();

  const inner = (
    <View style={[styles.card, { backgroundColor: `${t.warning}18`, borderColor: `${t.warning}40`, borderRadius: t.radius.lg }]}>
      <IconAlert size={18} color={t.warning} />
      <View style={styles.text}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{message}</Text>
        <Text style={[typography.caption, { color: t.warning }]}>Order refill now</Text>
      </View>
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
