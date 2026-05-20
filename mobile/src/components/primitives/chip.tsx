import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCheck, IconAlert, IconX } from '../../icons';

export type ChipVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
}

const DEFAULT_ICONS: Partial<Record<ChipVariant, (color: string) => React.ReactNode>> = {
  success: (color) => <IconCheck size={10} color={color} strokeWidth={2.5} />,
  warning: (color) => <IconAlert size={10} color={color} strokeWidth={2.5} />,
  danger:  (color) => <IconX     size={10} color={color} strokeWidth={2.5} />,
};

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
  const resolvedIcon = icon ?? DEFAULT_ICONS[variant]?.(text);

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderRadius: t.radius.pill }]}>
      {resolvedIcon && <View style={styles.icon}>{resolvedIcon}</View>}
      <Text style={[typography.micro, { color: text, fontWeight: '600', fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 },
  icon: { marginRight: 4 },
});
