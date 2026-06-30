import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Toggle } from '../primitives/toggle';
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
  testID?: string;
}

export function MenuRow({ label, icon, type, val, defaultVal = false, onPress, showDivider = true, testID }: MenuRowProps) {
  const t = useTheme();
  const [toggled, setToggled] = useState(defaultVal);
  const isDanger = type === 'danger';
  const isToggle = type === 'toggle';

  return (
    <Pressable
      onPress={isToggle ? undefined : onPress}
      accessibilityRole={isToggle ? 'switch' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isToggle ? { checked: toggled } : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: t.border },
        showDivider && styles.divider,
        pressed && !isToggle && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDanger ? `${t.danger}18` : t.brandSoft, borderRadius: t.radius.sm }]}>
        {icon}
      </View>
      <Text style={[typography.bodyMed, styles.label, { color: isDanger ? t.danger : t.ink }]}>
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
  row:     { flexDirection: 'row', alignItems: 'center', height: 56, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label:   { flex: 1 },
  right:   { flexDirection: 'row', alignItems: 'center' },
});
