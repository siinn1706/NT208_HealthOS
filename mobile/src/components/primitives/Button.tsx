import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export type ButtonVariant = 'solid' | 'ghost' | 'soft';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, variant = 'solid', icon, onPress, style }: ButtonProps) {
  const t = useTheme();

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    solid: { bg: t.brand,     text: '#FFFFFF' },
    ghost: { bg: 'transparent', text: t.brand, border: t.brand },
    soft:  { bg: t.brandSoft,  text: t.brand  },
  };

  const { bg, text, border } = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderRadius: t.radius.pill },
        border && { borderWidth: 1, borderColor: border },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && <>{icon}</>}
      <Text style={[typography.bodyMed, { color: text, marginLeft: icon ? 6 : 0 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  pressed: { opacity: 0.8 },
});
