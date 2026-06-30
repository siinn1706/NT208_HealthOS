import React from 'react';
import { Pressable, StyleSheet, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import type { ThemeTokens } from '../../theme/tokens';

export type ButtonVariant = 'solid' | 'ghost' | 'soft' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  onPress?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  labelColor?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Touch targets aligned to 8pt-ish grid; horizontal padding tracks theme `space`. */
const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };

function horizontalPad(t: ThemeTokens, size: ButtonSize): number {
  const map: Record<ButtonSize, keyof typeof t.space> = { sm: 3, md: 5, lg: 7 };
  return t.space[map[size]];
}

export function Button({
  label,
  variant = 'solid',
  size = 'md',
  icon,
  onPress,
  style,
  disabled,
  loading,
  labelColor,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const t = useTheme();

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    solid: { bg: t.brand,    text: '#FFFFFF'  },
    ghost: { bg: t.bgElev,   text: t.ink, border: t.border },
    soft:  { bg: t.brandSoft, text: t.brand   },
    text:  { bg: 'transparent', text: t.brand },
  };

  const { bg, text, border } = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: t.radius.md,
          height: HEIGHT[size],
          paddingHorizontal: variant === 'text' ? 8 : horizontalPad(t, size),
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
          <Text style={[typography.button, { color: labelColor ?? text, marginLeft: icon ? t.space[2] : 0 }]}>
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
  disabled: { opacity: 0.55 },
});
