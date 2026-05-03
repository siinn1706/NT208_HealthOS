import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';

interface IngredientRowProps {
  name: string;
  grams: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
}

export function IngredientRow({ name, grams, kcal, carbs, protein, fat }: IngredientRowProps) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={styles.left}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{grams}g · {kcal} kcal</Text>
      </View>
      <View style={styles.macros}>
        <MacroPill label="C" value={carbs} color="#E3B79A" />
        <MacroPill label="P" value={protein} color={t.brand} />
        <MacroPill label="F" value={fat} color="#5B90C4" />
      </View>
    </View>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[typography.micro, { color }]}>{label}</Text>
      <Text style={[typography.micro, tabularNums, { color, marginLeft: 2 }]}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  left:   { flex: 1, gap: 2 },
  macros: { flexDirection: 'row', gap: 6 },
  pill:   { flexDirection: 'row', alignItems: 'center' },
});
