import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
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
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, flex: 1, marginRight: 8 }} numberOfLines={1}>{name}</Text>
      {taken ? (
        <View style={[styles.takenBadge, { backgroundColor: t.success }]}>
          <IconCheck size={14} color={t.onBrand} />
        </View>
      ) : (
        <Pressable
          onPress={onTaken as () => void}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={i18n('meds.take')}
          style={[styles.takeBtn, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: t.onBrand }}>{i18n('meds.take')}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  time:      { fontSize: 15, fontWeight: '700', width: 56, marginRight: 12, fontVariant: ['tabular-nums'] as any },
  takenBadge:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  takeBtn:   { height: 34, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
