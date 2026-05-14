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
      {/* Left: name + grams */}
      <View style={styles.left}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{grams}g</Text>
      </View>
      {/* Right: kcal bold + macro sub-line */}
      <View style={styles.right}>
        <Text style={[typography.bodyMed, tabularNums, { color: t.ink }]}>{kcal} kcal</Text>
        <Text style={[typography.micro, { color: t.ink3 }]}>C {carbs}g P {protein}g F {fat}g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  left:  { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
