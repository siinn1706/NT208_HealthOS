import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { IconCheck } from '../../icons';
import type { DoseState } from '../../api/viewModels';

interface DoseRowProps {
  time: string;
  name: string;
  note: string;
  state: DoseState;
  onTaken?: () => Promise<void> | void;
}

export const DoseRow = React.memo(function DoseRow({ time, name, state: currentState, onTaken }: DoseRowProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const taken = currentState === 'taken';

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Text
        style={[
          styles.time,
          { color: taken ? t.ink4 : t.ink2, textDecorationLine: taken ? 'line-through' : 'none' },
        ]}
      >
        {time}
      </Text>
      <Text style={[typography.bodyMed, { color: t.ink, flex: 1, marginRight: 8 }]} numberOfLines={1}>{name}</Text>
      {taken ? (
        <View style={[styles.takenBadge, { backgroundColor: t.success }]}>
          <IconCheck size={14} color={t.onBrand} />
        </View>
      ) : (
        <Pressable
          onPress={onTaken as () => void}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={i18n('meds.take')}
          style={[styles.takeBtn, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
        >
          <Text style={[typography.chip, { color: t.onBrand }]}>{i18n('meds.take')}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  time:      { ...typography.bodyMed, ...tabularNums, width: 56, marginRight: 12 },
  takenBadge:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  takeBtn:   { height: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
