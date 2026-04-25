import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export type ChipVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
}

export function Chip({ label, variant = 'default', icon }: ChipProps) {
  const t = useTheme();

  const colors: Record<ChipVariant, { bg: string; text: string }> = {
    default:  { bg: t.chip,                    text: t.ink3   },
    success:  { bg: `${t.success}22`,          text: t.success },
    warning:  { bg: `${t.warning}22`,          text: t.warning },
    danger:   { bg: `${t.danger}22`,           text: t.danger  },
    brand:    { bg: t.brandSoft,               text: t.brand   },
  };

  const { bg, text } = colors[variant];

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderRadius: t.radius.pill }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[typography.micro, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  icon: { marginRight: 4 },
});
