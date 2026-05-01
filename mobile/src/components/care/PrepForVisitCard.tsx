import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle } from '../../icons';
import { Button } from '../primitives/Button';

interface PrepForVisitCardProps {
  onPress?: () => void;
}

export function PrepForVisitCard({ onPress }: PrepForVisitCardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.card,
        { borderColor: t.brand, borderRadius: t.radius.lg },
      ]}
    >
      <View style={styles.row}>
        <IconSparkle size={18} color={t.brand} />
        <View style={styles.text}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>Prep for your visit</Text>
          <Text style={[typography.caption, { color: t.ink3 }]}>
            AI-generated questions for Dr. Nguyen
          </Text>
        </View>
      </View>
      <Button label="View questions" variant="soft" onPress={onPress} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderStyle: 'dashed', padding: 14, marginVertical: 8, gap: 10 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
  btn:  { alignSelf: 'flex-start' },
});
