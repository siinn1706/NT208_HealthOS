import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconPlus } from '../../icons';

interface FoodRowProps {
  name: string;
  serving: string;
  kcal: number;
  onPress?: () => void;
}

export function FoodRow({ name, serving, kcal, onPress }: FoodRowProps) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={styles.info}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{serving}</Text>
      </View>
      <Text style={[typography.bodyMed, { color: t.ink2 }]}>{kcal} kcal</Text>
      <View style={[styles.addBtn, { backgroundColor: t.brandSoft }]}>
        <IconPlus size={14} color={t.brand} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  info:   { flex: 1, gap: 1 },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
