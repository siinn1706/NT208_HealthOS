import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';

interface RadioProps {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Radio({ value, onChange, disabled, accessibilityLabel }: RadioProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={() => !disabled && onChange()}
      accessibilityRole="radio"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.outer,
        {
          borderColor: value ? t.brand : t.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {value && (
        <View style={[styles.inner, { backgroundColor: t.brand }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5 },
});
