import React from 'react';
import { Pressable, StyleSheet, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export type ButtonVariant = 'solid' | 'ghost' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const H_PAD:  Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export function Button({
  label,
  variant = 'solid',
  size = 'md',
  icon,
  onPress,
  style,
  disabled,
  loading,
}: ButtonProps) {
  const t = useTheme();

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    solid: { bg: t.brand,      text: '#FFFFFF'  },
    ghost: { bg: 'transparent', text: t.brand, border: t.brand },
    soft:  { bg: t.brandSoft,  text: t.brand   },
  };

  const { bg, text, border } = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: t.radius.pill,
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
        },
        border && { borderWidth: 1, borderColor: border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={text} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[typography.button, { color: text, marginLeft: icon ? 6 : 0 }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pressed:  { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
