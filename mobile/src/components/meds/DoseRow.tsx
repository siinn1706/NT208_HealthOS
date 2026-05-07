import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCheck } from '../../icons';
import type { DoseState } from '../../api/viewModels';

interface DoseRowProps {
  time: string;
  name: string;
  note: string;
  state: DoseState;
  onTaken?: () => Promise<void> | void;
}

export function DoseRow({ time, name, state: currentState, onTaken }: DoseRowProps) {
  const t = useTheme();
  const taken = currentState === 'taken';

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Text
        style={[
          typography.bodyMed,
          styles.time,
          { color: taken ? t.ink4 : t.ink, textDecorationLine: taken ? 'line-through' : 'none' },
        ]}
      >
        {time}
      </Text>
      <Text style={[typography.body, styles.name, { color: t.ink }]} numberOfLines={1}>{name}</Text>
      {taken ? (
        <View style={[styles.takenBadge, { backgroundColor: t.success }]}>
          <IconCheck size={14} color="#FFF" />
        </View>
      ) : (
        <Pressable
          onPress={onTaken as () => void}
          hitSlop={8}
          style={[styles.takeBtn, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}
        >
          <Text style={[typography.button, { color: t.brand, fontSize: 13 }]}>Take</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  time:      { width: 56, marginRight: 12 },
  name:      { flex: 1, marginRight: 8 },
  takenBadge:{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  takeBtn:   { height: 32, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});
