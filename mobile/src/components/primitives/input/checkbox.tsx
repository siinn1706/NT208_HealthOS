import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/useTheme';

interface CheckboxProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Checkbox({ value, onChange, disabled, accessibilityLabel }: CheckboxProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={11}
      style={[
        styles.box,
        {
          borderRadius: t.radius.xs,
          backgroundColor: value ? t.brand : 'transparent',
          borderColor: value ? t.brand : t.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {value && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: 22, height: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
