import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { MedicationCheckButton } from './MedicationCheckButton';
import { IconCheck } from '../../icons';
import type { DoseState } from '../../mocks/meds';

interface DoseRowProps {
  time: string;
  name: string;
  note: string;
  state: DoseState;
}

export function DoseRow({ time, name, note, state: initialState }: DoseRowProps) {
  const t = useTheme();
  const [state, setState] = useState(initialState);

  const dotColor = state === 'taken' ? t.success : state === 'due' ? t.warning : t.border;

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.mid}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{time} · {note}</Text>
      </View>
      {state === 'taken' ? (
        <View style={[styles.takenBadge, { backgroundColor: `${t.success}18`, borderRadius: t.radius.pill }]}>
          <IconCheck size={12} color={t.success} />
          <Text style={[typography.micro, { color: t.success, marginLeft: 4 }]}>Taken</Text>
        </View>
      ) : (
        <MedicationCheckButton onTaken={() => setState('taken')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  mid:        { flex: 1 },
  takenBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5 },
});
