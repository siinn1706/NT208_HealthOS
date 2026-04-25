import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Toggle } from '../primitives/Toggle';
import { ChevronRight } from '../../icons';

export type MenuRowType = 'nav' | 'toggle' | 'danger';

interface MenuRowProps {
  label: string;
  icon: React.ReactNode;
  type: MenuRowType;
  val?: string;
  defaultVal?: boolean;
  onPress?: () => void;
  showDivider?: boolean;
}

export function MenuRow({ label, icon, type, val, defaultVal = false, onPress, showDivider = true }: MenuRowProps) {
  const t = useTheme();
  const [toggled, setToggled] = useState(defaultVal);
  const isDanger = type === 'danger';

  return (
    <Pressable
      onPress={type !== 'toggle' ? onPress : undefined}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: t.border },
        showDivider && styles.divider,
        pressed && type !== 'toggle' && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDanger ? `${t.danger}18` : t.bgElev, borderRadius: t.radius.sm }]}>
        <View style={{ opacity: isDanger ? 1 : 0.8 }}>
          {icon}
        </View>
      </View>
      <Text style={[typography.body, styles.label, { color: isDanger ? t.danger : t.ink }]}>
        {label}
      </Text>
      {type === 'toggle' ? (
        <Toggle value={toggled} onChange={setToggled} />
      ) : type === 'nav' ? (
        <View style={styles.right}>
          {val && <Text style={[typography.caption, { color: t.ink4, marginRight: 4 }]}>{val}</Text>}
          <ChevronRight size={16} color={t.ink4} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap:{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  label:   { flex: 1 },
  right:   { flexDirection: 'row', alignItems: 'center' },
});
